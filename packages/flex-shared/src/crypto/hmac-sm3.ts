import smCrypto from 'sm-crypto';

const { sm3 } = smCrypto;

/**
 * HMAC-SM3 签名（对齐后端 HmacSm3Signer）。
 *
 * HMAC-SM3 = SM3(key ⊕ opad ‖ SM3(key ⊕ ipad ‖ data))（RFC 2104）。
 *
 * @param data 签名输入字符串
 * @param key SM4 密钥（16 字节）
 * @returns Base64 签名值
 */
export function hmacSm3Sign(data: string, key: Uint8Array): string {
  const hmac = computeHmacSm3(new TextEncoder().encode(data), key);
  return Buffer.from(hmac).toString('base64');
}

/** HMAC-SM3 验签（常量时间比较）。 */
export function hmacSm3Verify(data: string, key: Uint8Array, signatureBase64: string): boolean {
  const expected = computeHmacSm3(new TextEncoder().encode(data), key);
  const provided = Buffer.from(signatureBase64, 'base64');
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected[i]! ^ provided[i]!;
  }
  return diff === 0;
}

/** HMAC-SM3 原始实现（RFC 2104: H(K⊕opad ‖ H(K⊕ipad ‖ msg))）。 */
function computeHmacSm3(message: Uint8Array, key: Uint8Array): Uint8Array {
  const blockSize = 64; // SM3 block size
  let k = key;
  if (k.length > blockSize) {
    k = new Uint8Array(Buffer.from(sm3(Buffer.from(k)), 'hex'));
  }
  if (k.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(k);
    k = padded;
  }
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = k[i]! ^ 0x36;
    opad[i] = k[i]! ^ 0x5c;
  }
  const inner = new Uint8Array(blockSize + message.length);
  inner.set(ipad);
  inner.set(message, blockSize);
  const innerHash = new Uint8Array(Buffer.from(sm3(Buffer.from(inner)), 'hex'));
  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, blockSize);
  return new Uint8Array(Buffer.from(sm3(Buffer.from(outer)), 'hex'));
}
