import { encryptBlock } from './sm4-block';

const NONCE_LEN = 12;
const TAG_LEN = 16;
const BLOCK_SIZE = 16;

/**
 * SM4-GCM 加解密（对齐后端 Sm4Cipher：nonce(12) + ciphertext + tag(16)）。
 *
 * 用标准 SM4 分组密码（sm4-block.ts，GB/T 32907-2016）+ 手动 GCM 模式。
 * sm-crypto 的 SM4 轮函数非标准，故不用其 SM4。
 *
 * ⚠️ 已验证：SM4-ECB 单块与后端 BC 一致（SmInteropTest）。
 */

/** 单块 SM4 加密（ECB，16 字节 → 16 字节）。 */
function sm4EncryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  return encryptBlock(key, block);
}

/** SM4-GCM 加密。 */
export function encrypt(plaintext: string, key: Uint8Array): string {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // GCM 标准：
  // 1. H = E(K, 0^128) — hash subkey
  const H = sm4EncryptBlock(key, new Uint8Array(BLOCK_SIZE));

  // 2. J0 = nonce ‖ 0^31 ‖ 1 (len(nonce)==96 bit)
  const J0 = new Uint8Array(BLOCK_SIZE);
  J0.set(nonce);
  J0[15] = 1;

  // 3. 加密：CTR mode，从 inc32(J0) 开始
  const ciphertext = gcmCtr(key, J0, plaintextBytes);

  // 4. GHASH: AAD(空) ‖ C ‖ len(AAD)‖len(C)
  const tag = ghash(H, new Uint8Array(0), ciphertext);

  // 5. T = E(K, J0) ⊕ GHASH
  const ej0 = sm4EncryptBlock(key, J0);
  const finalTag = xor(tag, ej0);

  // 拼接 nonce + ciphertext + tag
  const output = new Uint8Array(NONCE_LEN + ciphertext.length + TAG_LEN);
  output.set(nonce, 0);
  output.set(ciphertext, NONCE_LEN);
  output.set(finalTag, NONCE_LEN + ciphertext.length);
  return Buffer.from(output).toString('base64');
}

/** SM4-GCM 解密。 */
export function decrypt(encryptedBase64: string, key: Uint8Array): string {
  const raw = Buffer.from(encryptedBase64, 'base64');
  const nonce = raw.slice(0, NONCE_LEN);
  const tag = raw.slice(raw.length - TAG_LEN);
  const ciphertext = raw.slice(NONCE_LEN, raw.length - TAG_LEN);

  const H = sm4EncryptBlock(key, new Uint8Array(BLOCK_SIZE));
  const J0 = new Uint8Array(BLOCK_SIZE);
  J0.set(nonce);
  J0[15] = 1;

  // 验证 tag
  const expectedTag = ghash(H, new Uint8Array(0), ciphertext);
  const ej0 = sm4EncryptBlock(key, J0);
  const computedTag = xor(expectedTag, ej0);

  if (!constantTimeEquals(tag, computedTag)) {
    throw new Error('SM4-GCM 认证失败（tag 不匹配，密钥错误或报文损坏）');
  }

  // 解密：CTR
  const plaintext = gcmCtr(key, J0, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// ===== GCM 内部实现 =====

/** GCM CTR 模式加解密（从 inc32(J0) 开始）。 */
function gcmCtr(key: Uint8Array, j0: Uint8Array, data: Uint8Array): Uint8Array {
  const output = new Uint8Array(data.length);
  const counter = new Uint8Array(j0);

  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    inc32(counter);
    const keystream = sm4EncryptBlock(key, counter);
    const blockLen = Math.min(BLOCK_SIZE, data.length - offset);
    for (let i = 0; i < blockLen; i++) {
      output[offset + i] = data[offset + i]! ^ keystream[i]!;
    }
  }
  return output;
}

/** GHASH（GMUL over GF(2^128)）。 */
function ghash(h: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  let y: Uint8Array = new Uint8Array(BLOCK_SIZE);

  // GHASH(AAD)
  if (aad.length > 0) {
    for (let i = 0; i < aad.length; i += BLOCK_SIZE) {
      const block = new Uint8Array(BLOCK_SIZE);
      block.set(aad.slice(i, Math.min(i + BLOCK_SIZE, aad.length)));
      y = xor(y, block) as Uint8Array;
      y = gmul(y, h) as Uint8Array;
    }
  }

  // GHASH(C)
  for (let i = 0; i < ciphertext.length; i += BLOCK_SIZE) {
    const block = new Uint8Array(BLOCK_SIZE);
    block.set(ciphertext.slice(i, Math.min(i + BLOCK_SIZE, ciphertext.length)));
    y = xor(y, block) as Uint8Array;
    y = gmul(y, h) as Uint8Array;
  }

  // 长度块：len(AAD)*8 ‖ len(C)*8（各 64 bit big-endian）
  const lenBlock = new Uint8Array(BLOCK_SIZE);
  const aadBits = BigInt(aad.length) * 8n;
  const ctBits = BigInt(ciphertext.length) * 8n;
  writeUint64BE(lenBlock, 0, aadBits);
  writeUint64BE(lenBlock, 8, ctBits);
  y = xor(y, lenBlock) as Uint8Array;
  y = gmul(y, h) as Uint8Array;

  return y;
}

/** GF(2^128) 乘法（GHASH 核心，使用 NIST polynomial x^128 + x^7 + x^2 + x + 1）。 */
function gmul(x: Uint8Array, y: Uint8Array): Uint8Array {
  const z = new Uint8Array(BLOCK_SIZE);
  const v = new Uint8Array(y);

  for (let i = 0; i < BLOCK_SIZE; i++) {
    for (let bit = 7; bit >= 0; bit--) {
      if ((x[i]! >> bit) & 1) {
        for (let j = 0; j < BLOCK_SIZE; j++) {
          z[j] = z[j]! ^ v[j]!;
        }
      }
      // 右移 v，若 LSB=1 则异或 R (0xe1 << 120)
      const lsb = v[BLOCK_SIZE - 1]! & 1;
      const shifted = new Uint8Array(BLOCK_SIZE);
      for (let j = BLOCK_SIZE - 1; j > 0; j--) {
        shifted[j] = ((v[j]! >>> 1) | ((v[j - 1]! & 1) << 7)) & 0xff;
      }
      shifted[0] = (v[0]! >>> 1) & 0xff;
      v.set(shifted);
      if (lsb) {
        v[0] = v[0]! ^ 0xe1;
      }
    }
  }
  return z;
}

/** CTR 计数器 +1（只递增后 4 字节，GCM inc32）。 */
function inc32(counter: Uint8Array): void {
  for (let i = 15; i >= 12; i--) {
    counter[i] = (counter[i]! + 1) & 0xff;
    if (counter[i] !== 0) break;
  }
}

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]! ^ b[i]!;
  }
  return out;
}

function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

function writeUint64BE(buf: Uint8Array, offset: number, value: bigint): void {
  for (let i = 7; i >= 0; i--) {
    buf[offset + i] = Number(value & 0xffn);
    value >>= 8n;
  }
}
