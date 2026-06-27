# SM 工具 + 加密 Axios 拦截器 Implementation Plan (前端 flex-app-web main)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement SM2 ECDH + SM4-GCM + HMAC-SM3 crypto utilities and Axios interceptors in the flex-app-web frontend so that encrypted endpoints (currently `POST /api/auth/login`) are transparently encrypted/signed on request and decrypted on response.

**Architecture:** SM crypto utilities live in `packages/flex-shared/src/crypto/` (framework-agnostic, injected into the main shell). The SM2 ECDH uses `@noble/curves` on the sm2p256v1 curve, SM4-GCM and HMAC-SM3 use `sm-crypto`. A key-manager caches the client keypair + negotiated SM4 key (in-memory, reused across requests). A crypto-rules module caches the encrypted-paths list from the handshake. Two Axios interceptors (request: encrypt+sign; response: decrypt+retry) are registered in `apps/web-antd/src/api/request.ts`.

**Tech Stack:** TypeScript, `@noble/curves` (ECDH on sm2p256v1), `@noble/hashes` (HKDF-SHA256), `sm-crypto` (SM3/SM4-GCM), Axios, vitest (root `vitest.config.ts`, happy-dom env).

**Reference spec:** `docs/superpowers/specs/2026-06-25-api-crypto-handshake-frontend-design.md` (in the backend repo)

**Prerequisite:** Backend Plan 1 must be implemented first (handshake endpoint `POST /api/crypto/handshake` + 3D rule model + login `@Encrypted(REQUIRED)`).

**Current scope:** Only `POST /api/auth/login` is encrypted. The interceptor is generic (driven by backend handshake rules) but only login triggers encryption in practice.

**Environment:**
- Repo: `/Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web` (independent git repo, branch `main`)
- Package manager: `pnpm`
- Test: `pnpm test:unit` (runs vitest across all packages) or `pnpm --filter @flex/shared exec vitest run` for a single package
- Test files: `*.test.ts` colocated in `packages/flex-shared/src/crypto/`
- **Interoperability is critical**: JS ECDH/SM4/HMAC output must be byte-compatible with backend BouncyCastle. Use backend test vectors for unit tests.

---

## File Structure

### New files (`packages/flex-shared/src/crypto/`)

| File | Responsibility |
|---|---|
| `types.ts` | TypeScript interfaces: `CryptoRule`, `HandshakeResponse`, `KeyMaterial` |
| `sm2.ts` | SM2 keypair gen + ECDH + raw-point Base64 encode/decode (`@noble/curves`) |
| `sm4.ts` | SM4-GCM encrypt/decrypt (Base64 format, `sm-crypto`) |
| `hmac-sm3.ts` | HMAC-SM3 sign/verify (`sm-crypto`) |
| `kdf.ts` | HKDF-SHA256 key derivation (`@noble/hashes`, info="flex-api-sm4") |
| `signature-builder.ts` | 6-element signature input builder |
| `key-manager.ts` | Client keypair cache + SM4 key cache + handshake trigger |
| `crypto-rules.ts` | Encrypted-paths cache + match + ruleVersion |
| `crypto-interceptor.ts` | Request + response Axios interceptor factories |
| `index.ts` | Barrel export |

### Modified files

| File | Change |
|---|---|
| `packages/flex-shared/package.json` | Add `@noble/curves`, `@noble/hashes`, `sm-crypto` deps |
| `packages/flex-shared/src/index.ts` | Export crypto module |
| `apps/web-antd/src/api/request.ts` | Register crypto interceptors |

---

## Task 1: Add SM crypto dependencies

**Files:**
- Modify: `packages/flex-shared/package.json`

- [ ] **Step 1: Add dependencies**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm --filter @flex/shared add @noble/curves @noble/hashes sm-crypto`

Expected: 3 packages added to `packages/flex-shared/package.json` dependencies.

- [ ] **Step 2: Verify installation**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm install && node -e "require('@noble/curves'); require('@noble/hashes'); require('sm-crypto'); console.log('deps OK')"`
Expected: `deps OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web
git add packages/flex-shared/package.json pnpm-lock.yaml
git commit -m "feat(crypto): 添加 @noble/curves/@noble/hashes/sm-crypto 依赖"
```

---

## Task 2: types.ts

**Files:**
- Create: `packages/flex-shared/src/crypto/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
/**
 * 加密规则（前端从握手响应获取，缓存匹配用）。
 */
export interface CryptoRule {
  method: string;
  path: string;
  encryptMode: 'REQUIRED' | 'OPTIONAL' | 'FORBIDDEN' | 'NONE';
  signMode: 'REQUIRED' | 'OPTIONAL' | 'NONE';
  direction: 'REQUEST' | 'RESPONSE' | 'BOTH';
}

/**
 * 握手响应（POST /api/crypto/handshake）。
 */
export interface HandshakeResponse {
  handshakeId: string;
  serverPubKey: string;
  ruleVersion: number;
  encryptedPaths: CryptoRule[];
}

/**
 * 客户端密钥材料（内存缓存）。
 */
export interface ClientKeyMaterial {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyBase64: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/flex-shared/src/crypto/types.ts
git commit -m "feat(crypto): 类型定义（CryptoRule/HandshakeResponse/ClientKeyMaterial）"
```

---

## Task 3: sm2.ts — SM2 keypair + ECDH + Base64

**Files:**
- Create: `packages/flex-shared/src/crypto/sm2.ts`
- Test: `packages/flex-shared/src/crypto/sm2.test.ts`

The SM2 key uses the `sm2p256v1` curve via `@noble/curves`. Public key encoding must match the backend: uncompressed raw point `0x04 ‖ X(32) ‖ Y(32)` → Base64.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';

import { decodePublicKeyBase64, encodePublicKeyBase64, generateKeyPair } from './sm2';

describe('sm2', () => {
  it('generateKeyPair returns 32-byte private key', () => {
    const km = generateKeyPair();
    expect(km.privateKey).toHaveLength(32);
  });

  it('encodePublicKeyBase64 produces decodable 65-byte point', () => {
    const km = generateKeyPair();
    const b64 = encodePublicKeyBase64(km.publicKey);
    const raw = Buffer.from(b64, 'base64');
    expect(raw).toHaveLength(65);
    expect(raw[0]).toBe(0x04);
  });

  it('decodePublicKeyBase64 round-trips', () => {
    const km = generateKeyPair();
    const b64 = encodePublicKeyBase64(km.publicKey);
    const decoded = decodePublicKeyBase64(b64);
    expect(decoded).toEqual(km.publicKey);
  });

  it('agree is symmetric (client.agree(serverPub) == server.agree(clientPub))', () => {
    const client = generateKeyPair();
    const server = generateKeyPair();
    const clientShared = agree(client.privateKey, server.publicKey);
    const serverShared = agree(server.privateKey, client.publicKey);
    expect(Buffer.from(clientShared)).toEqual(Buffer.from(serverShared));
  });
});
```

> **Note:** `agree` must be imported from `./sm2` in the test. Add it to the import line.

- [ ] **Step 2: Implement sm2.ts**

```typescript
import { p256 } from '@noble/curves/sm2';

/**
 * SM2 密钥对生成 + ECDH + 原始点 Base64 编解码。
 *
 * <p>使用 @noble/curves 的 sm2p256v1 曲线（与后端 BouncyCastle 一致）。
 * 公钥编码：未压缩原始点 0x04‖X(32)‖Y(32) → Base64（与后端 Sm2KeyPairGenerator 一致）。
 * 私钥编码：32 字节大端标量。
 */

/** 生成 SM2 临时密钥对。 */
export function generateKeyPair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const priv = p256.utils.randomPrivateKey();
  const pub = p256.getPublicKey(priv, false); // false = uncompressed (65 bytes)
  return { privateKey: priv, publicKey: pub };
}

/** 公钥原始点 → Base64。 */
export function encodePublicKeyBase64(publicKey: Uint8Array): string {
  return Buffer.from(publicKey).toString('base64');
}

/** Base64 公钥 → 原始点。 */
export function decodePublicKeyBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * ECDH 密钥协商（标准 ECDH on sm2p256v1）。
 *
 * @param myPrivateKey 我方私钥（32 字节标量）
 * @param peerPublicKey 对方公钥（65 字节未压缩点）
 * @returns 共享密钥（32 字节 x 坐标）
 */
export function agree(myPrivateKey: Uint8Array, peerPublicKey: Uint8Array): Uint8Array {
  return p256.getSharedSecret(myPrivateKey, peerPublicKey).slice(1, 33);
  // getSharedSecret 返回 0x04‖X‖Y，取 X（前 32 字节，去掉 04 前缀）
}
```

> **IMPORTANT:** The `@noble/curves` `getSharedSecret` returns the full point `0x04‖X‖Y`. The backend BC `ECDHBasicAgreement` returns only the X coordinate. We slice `[1,33]` to get X only — matching the backend. **This must be verified during execution** — if `getSharedSecret` returns just the X coordinate (no prefix), adjust the slice accordingly.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm test:unit -- packages/flex-shared/src/crypto/sm2.test.ts 2>&1 | tail -15`
Expected: PASS (4 tests). If ECDH symmetry fails, check the `getSharedSecret` return format and adjust the slice.

- [ ] **Step 4: Commit**

```bash
git add packages/flex-shared/src/crypto/sm2.ts packages/flex-shared/src/crypto/sm2.test.ts
git commit -m "feat(crypto): SM2 密钥对生成 + ECDH + 原始点 Base64（@noble/curves sm2p256v1）"
```

---

## Task 4: kdf.ts — HKDF-SHA256 key derivation

**Files:**
- Create: `packages/flex-shared/src/crypto/kdf.ts`
- Test: `packages/flex-shared/src/crypto/kdf.test.ts`

Must match backend `HkdfSha256.deriveKey(shared, salt=null, info="flex-api-sm4", length=16)`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';

import { deriveSm4Key } from './kdf';

describe('kdf', () => {
  it('deriveSm4Key returns 16 bytes', () => {
    const shared = new Uint8Array(32);
    const key = deriveSm4Key(shared);
    expect(key).toHaveLength(16);
  });

  it('deriveSm4Key is deterministic', () => {
    const shared = new TextEncoder().encode('12345678901234567890123456789012');
    expect(Buffer.from(deriveSm4Key(shared))).toEqual(Buffer.from(deriveSm4Key(shared)));
  });

  it('different shared secrets produce different keys', () => {
    const a = new Uint8Array(32);
    const b = new Uint8Array(32);
    b[0] = 1;
    expect(Buffer.from(deriveSm4Key(a))).not.toEqual(Buffer.from(deriveSm4Key(b)));
  });
});
```

- [ ] **Step 2: Implement kdf.ts**

```typescript
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

/**
 * HKDF-SHA256 SM4 密钥派生（对齐后端 HkdfSha256）。
 *
 * info = "flex-api-sm4"（上下文绑定），length = 16（128-bit SM4）。
 *
 * @param ecdhSharedSecret ECDH 共享密钥（32 字节）
 * @returns 16 字节 SM4 密钥
 */
export function deriveSm4Key(ecdhSharedSecret: Uint8Array): Uint8Array {
  const info = new TextEncoder().encode('flex-api-sm4');
  const salt = new Uint8Array(32); // null salt → 32 zero bytes (RFC 5869)
  return hkdf(sha256, ecdhSharedSecret, salt, info, 16);
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm test:unit -- packages/flex-shared/src/crypto/kdf.test.ts 2>&1 | tail -10`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add packages/flex-shared/src/crypto/kdf.ts packages/flex-shared/src/crypto/kdf.test.ts
git commit -m "feat(crypto): HKDF-SHA256 SM4 密钥派生（info=flex-api-sm4，对齐后端）"
```

---

## Task 5: sm4.ts — SM4-GCM encrypt/decrypt

**Files:**
- Create: `packages/flex-shared/src/crypto/sm4.ts`
- Test: `packages/flex-shared/src/crypto/sm4.test.ts`

Must produce/consume the backend format: `Base64(nonce(12) + ciphertext + tag(16))`.

> **NOTE on sm-crypto SM4-GCM:** The `sm-crypto` library's SM4 implementation may use CBC, not GCM. **This is the highest-risk interop point.** If `sm-crypto` lacks GCM, we must use `@noble/ciphers` (chacha20/aes is NOT SM4) or implement SM4-GCM manually. During execution: first check `sm-crypto`'s API. If no GCM, use the `js-smsm4` or `gm-crypt` library's GCM, OR implement SM4-GCM using the SM4 block cipher from `sm-crypto` + manual GCM mode (counter + GHASH). **The backend `Sm4Cipher` uses BC's `SM4/GCM/NoPadding` with 12-byte nonce + 128-bit tag.**

- [ ] **Step 1: Check sm-crypto SM4-GCM API**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && node -e "const sm4 = require('sm-crypto').sm4; console.log(Object.keys(sm4))"`
Expected: See if `encrypt`/`decrypt` support GCM mode or only CBC. Document the finding.

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';

import { decrypt, encrypt } from './sm4';

describe('sm4-gcm', () => {
  const key = new Uint8Array(16); // 128-bit zero key

  it('encrypt then decrypt round-trip', () => {
    const plaintext = '{"username":"admin","password":"P@ssw0rd"}';
    const encrypted = encrypt(plaintext, key);
    expect(decrypt(encrypted, key)).toBe(plaintext);
  });

  it('encrypted output is Base64', () => {
    const encrypted = encrypt('hello', key);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('same plaintext yields different ciphertext (random nonce)', () => {
    expect(encrypt('same', key)).not.toBe(encrypt('same', key));
  });

  it('decrypt with wrong key fails', () => {
    const encrypted = encrypt('secret', key);
    const wrongKey = new Uint8Array(16);
    wrongKey[0] = 1;
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });
});
```

- [ ] **Step 3: Implement sm4.ts**

> **If sm-crypto supports GCM**, use it. Otherwise, implement SM4-GCM manually. Below is the **fallback manual GCM implementation** using sm-crypto's SM4 block cipher:

```typescript
import { sm4 as sm4Cipher } from 'sm-crypto';

const NONCE_LEN = 12;
const TAG_LEN = 16;

/**
 * SM4-GCM 加密（对齐后端 Sm4Cipher：nonce(12) + ciphertext + tag(16)）。
 *
 * <p>⚠️ sm-crypto 原生不支持 GCM，本实现用 SM4 block cipher + 手动 GCM 模式。
 * 若 sm-crypto 已支持 GCM，改用原生 API。
 *
 * @param plaintext 明文字符串（UTF-8）
 * @param key 16 字节 SM4 密钥
 * @returns Base64(nonce + ciphertext + tag)
 */
export function encrypt(plaintext: string, key: Uint8Array): string {
  // TODO: 验证 sm-crypto 是否支持 GCM。若不支持，用以下手动实现：
  // 1. 生成随机 12 字节 nonce
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // 2. SM4-GCM: CTR mode encrypt + GHASH tag
  //    （GCM = CTR encryption + GHASH authentication）
  const { ciphertext, tag } = sm4GcmEncrypt(key, nonce, plaintextBytes);

  // 3. 拼接 nonce + ciphertext + tag → Base64
  const output = new Uint8Array(NONCE_LEN + ciphertext.length + TAG_LEN);
  output.set(nonce, 0);
  output.set(ciphertext, NONCE_LEN);
  output.set(tag, NONCE_LEN + ciphertext.length);
  return Buffer.from(output).toString('base64');
}

/**
 * SM4-GCM 解密。
 *
 * @param encryptedBase64 Base64(nonce + ciphertext + tag)
 * @param key 16 字节 SM4 密钥
 * @returns 明文字符串（UTF-8）
 */
export function decrypt(encryptedBase64: string, key: Uint8Array): string {
  const raw = Buffer.from(encryptedBase64, 'base64');
  const nonce = raw.slice(0, NONCE_LEN);
  const tag = raw.slice(raw.length - TAG_LEN);
  const ciphertext = raw.slice(NONCE_LEN, raw.length - TAG_LEN);

  const plaintext = sm4GcmDecrypt(key, nonce, ciphertext, tag);
  return new TextEncoder.decode(plaintext); // or Buffer.from(plaintext).toString('utf-8')
}

// ===== SM4-GCM 手动实现（CTR + GHASH）=====
// 注：GCM 模式的标准实现。SM4 作为 block cipher（16 字节块）。
// 若 sm-crypto 或其他库提供 SM4-GCM，替换此部分。

function sm4GcmEncrypt(key: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array): {
  ciphertext: Uint8Array;
  tag: Uint8Array;
} {
  // GCM 标准算法：
  // 1. H = SM4-Encrypt(key, 0^128)  — hash subkey
  // 2. J0 = nonce ‖ 0^31 ‖ 1  (when len(nonce)==12)
  // 3. CTR encryption: Ci = Pi ⊕ SM4-Encrypt(key, inc(J0+i))
  // 4. GHASH over AAD(空) ‖ C → S
  // 5. T = SM4-Encrypt(key, J0) ⊕ S
  //
  // ⚠️ 这是简化版，执行时需完整实现或用库。
  // 建议执行时先验证 sm-crypto 是否支持 GCM，若不支持考虑 gm-crypt 库。
  throw new Error('SM4-GCM 实现待完成：执行时验证 sm-crypto/gm-crypt GCM 支持');
}

function sm4GcmDecrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
): Uint8Array {
  throw new Error('SM4-GCM 解密待完成：执行时验证 sm-crypto/gm-crypt GCM 支持');
}
```

> **CRITICAL EXECUTION NOTE:** The SM4-GCM implementation is the #1 interop risk. The plan provides the structure, but the executor MUST:
> 1. First check if `sm-crypto` has native GCM support
> 2. If not, check `gm-crypt` (`npm i gm-crypt`)
> 3. If neither, implement GCM manually using SM4 block cipher (CTR + GHASH)
> 4. Verify byte-compatibility with the backend by running a real handshake + encrypted request against the running backend

- [ ] **Step 4: Run test and verify**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm test:unit -- packages/flex-shared/src/crypto/sm4.test.ts 2>&1 | tail -10`
Expected: PASS (4 tests) once GCM is properly implemented.

- [ ] **Step 5: Commit**

```bash
git add packages/flex-shared/src/crypto/sm4.ts packages/flex-shared/src/crypto/sm4.test.ts
git commit -m "feat(crypto): SM4-GCM 加解密（对齐后端 nonce+ct+tag Base64 格式）"
```

---

## Task 6: hmac-sm3.ts + signature-builder.ts

**Files:**
- Create: `packages/flex-shared/src/crypto/hmac-sm3.ts`
- Create: `packages/flex-shared/src/crypto/signature-builder.ts`
- Test: `packages/flex-shared/src/crypto/signature-builder.test.ts`

- [ ] **Step 1: Implement hmac-sm3.ts**

```typescript
import { sm3 } from 'sm-crypto';

/**
 * HMAC-SM3 签名（对齐后端 HmacSm3Signer）。
 *
 * <p>sm-crypto 的 sm3 是哈希函数。HMAC-SM3 = SM3(key ⊕ opad ‖ SM3(key ⊕ ipad ‖ data))。
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
    diff |= expected[i] ^ provided[i];
  }
  return diff === 0;
}

/** HMAC-SM3 原始实现（RFC 2104: H(K⊕opad ‖ H(K⊕ipad ‖ msg))）。 */
function computeHmacSm3(message: Uint8Array, key: Uint8Array): Uint8Array {
  const blockSize = 64; // SM3 block size
  let k = key;
  if (k.length > blockSize) {
    k = Buffer.from(sm3(Buffer.from(k)), 'hex');
  }
  if (k.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(k);
    k = padded;
  }
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = k[i] ^ 0x36;
    opad[i] = k[i] ^ 0x5c;
  }
  const inner = new Uint8Array(blockSize + message.length);
  inner.set(ipad);
  inner.set(message, blockSize);
  const innerHash = Buffer.from(sm3(Buffer.from(inner)), 'hex');
  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, blockSize);
  return Buffer.from(sm3(Buffer.from(outer)), 'hex');
}
```

> **NOTE:** `sm-crypto`'s `sm3` function may take a hex string or Buffer and return a hex string. Verify the API during execution and adjust. The backend BC `HmacSM3` produces a 32-byte tag.

- [ ] **Step 2: Implement signature-builder.ts**

```typescript
import { sha256 } from '@noble/hashes/sha256';

/**
 * 构建增强签名输入（对齐后端 SignatureInputBuilder §4.1）。
 *
 * 格式：METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + TOKEN + "\n" + SHA256(body)
 */
export function buildSignatureInput(params: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  token: string | null;
  body: Uint8Array;
}): string {
  const bodyHash = Buffer.from(sha256(params.body)).toString('hex');
  return [
    params.method,
    params.path,
    params.timestamp,
    params.nonce,
    params.token ?? '',
    bodyHash,
  ].join('\n');
}
```

- [ ] **Step 3: Write signature-builder test**

```typescript
import { describe, expect, it } from 'vitest';

import { buildSignatureInput } from './signature-builder';

describe('signature-builder', () => {
  it('builds 6-element string', () => {
    const input = buildSignatureInput({
      method: 'POST',
      path: '/api/auth/login',
      timestamp: '1718064000000',
      nonce: 'a1b2c3d4',
      token: 'token-xyz',
      body: new TextEncoder().encode('{"u":"a"}'),
    });
    const parts = input.split('\n');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('POST');
    expect(parts[1]).toBe('/api/auth/login');
    expect(parts[4]).toBe('token-xyz');
    expect(parts[5]).toHaveLength(64); // SHA-256 hex
  });

  it('empty token when null', () => {
    const input = buildSignatureInput({
      method: 'GET', path: '/p', timestamp: '1', nonce: 'n',
      token: null, body: new Uint8Array(0),
    });
    expect(input.split('\n')[4]).toBe('');
  });

  it('body is sha256 hex', () => {
    const input = buildSignatureInput({
      method: 'GET', path: '/p', timestamp: '1', nonce: 'n', token: 't',
      body: new TextEncoder().encode('hello'),
    });
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(input.split('\n')[5]).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm test:unit -- packages/flex-shared/src/crypto/signature-builder.test.ts 2>&1 | tail -10`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/flex-shared/src/crypto/hmac-sm3.ts \
        packages/flex-shared/src/crypto/signature-builder.ts \
        packages/flex-shared/src/crypto/signature-builder.test.ts
git commit -m "feat(crypto): HMAC-SM3 签名 + 六要素签名输入构造"
```

---

## Task 7: key-manager.ts + crypto-rules.ts

**Files:**
- Create: `packages/flex-shared/src/crypto/key-manager.ts`
- Create: `packages/flex-shared/src/crypto/crypto-rules.ts`

- [ ] **Step 1: Implement crypto-rules.ts**

```typescript
import type { CryptoRule, HandshakeResponse } from './types';

/**
 * 加密规则缓存（从握手响应获取，前端匹配用）。
 *
 * <p>缓存 encryptedPaths + ruleVersion，请求前查匹配。
 * 收到 Crypto-Rule-Outdated 头时调 refresh 更新。
 */

let cachedRules: CryptoRule[] = [];
let cachedRuleVersion = 0;
let cachedHandshake: HandshakeResponse | null = null;

/** 更新缓存（握手后调用）。 */
export function updateRules(handshake: HandshakeResponse): void {
  cachedHandshake = handshake;
  cachedRules = handshake.encryptedPaths;
  cachedRuleVersion = handshake.ruleVersion;
}

/** 匹配规则（method + path）。 */
export function matchRule(method: string, path: string): CryptoRule | null {
  for (const rule of cachedRules) {
    if (
      (rule.method === '*' || rule.method.toUpperCase() === method.toUpperCase())
      && pathMatches(rule.path, path)
    ) {
      return rule;
    }
  }
  return null;
}

/** 当前规则版本号。 */
export function currentRuleVersion(): number {
  return cachedRuleVersion;
}

/** 当前 handshakeId（供请求头 Crypto-HandshakeId）。 */
export function currentHandshakeId(): string | null {
  return cachedHandshake?.handshakeId ?? null;
}

/** 当前 serverPubKey（供响应解密 ECDH）。 */
export function currentServerPubKey(): string | null {
  return cachedHandshake?.serverPubKey ?? null;
}

/** 清缓存（规则变更重试时）。 */
export function clearRules(): void {
  cachedRules = [];
  cachedRuleVersion = 0;
  cachedHandshake = null;
}

/** 简单路径匹配（支持 * 通配，与后端 AntPathMatcher 基本对齐）。 */
function pathMatches(pattern: string, path: string): boolean {
  if (pattern === '/**' || pattern === path) return true;
  // 简化：支持 /api/auth/** 风格
  if (pattern.endsWith('/**')) {
    return path.startsWith(pattern.slice(0, -3));
  }
  return false;
}
```

- [ ] **Step 2: Implement key-manager.ts**

```typescript
import { agree, decodePublicKeyBase64, encodePublicKeyBase64, generateKeyPair } from './sm2';
import { deriveSm4Key } from './kdf';
import type { ClientKeyMaterial } from './types';

/**
 * 密钥管理器（内存缓存，防频繁握手）。
 *
 * <p>未登录：client 密钥对生成一次（内存固定），sm4Key 从握手派生缓存。
 * 已登录：从响应头 serverPubKey 派生 sm4Key。
 */

let clientKeyPair: ClientKeyMaterial | null = null;
let cachedSm4Key: Uint8Array | null = null;

/** 获取或生成 client 密钥对（整个页面生命周期固定）。 */
export function getClientKeyPair(): ClientKeyMaterial {
  if (!clientKeyPair) {
    const km = generateKeyPair();
    clientKeyPair = {
      privateKey: km.privateKey,
      publicKey: km.publicKey,
      publicKeyBase64: encodePublicKeyBase64(km.publicKey),
    };
  }
  return clientKeyPair;
}

/** 从 serverPubKey 派生 sm4Key（缓存，只要 client 密钥对不变+同一 serverPubKey 则相同）。 */
export function deriveSm4KeyFromServer(serverPubKeyBase64: string): Uint8Array {
  // 简单缓存：若已派生且 serverPubKey 未变则复用
  if (cachedSm4Key) {
    return cachedSm4Key;
  }
  const client = getClientKeyPair();
  const serverPub = decodePublicKeyBase64(serverPubKeyBase64);
  const shared = agree(client.privateKey, serverPub);
  cachedSm4Key = deriveSm4Key(shared);
  return cachedSm4Key;
}

/** 获取缓存的 sm4Key（握手后已派生）。 */
export function getCachedSm4Key(): Uint8Array | null {
  return cachedSm4Key;
}

/** 清除密钥缓存（登出/重试时）。 */
export function clearKeys(): void {
  clientKeyPair = null;
  cachedSm4Key = null;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/flex-shared/src/crypto/key-manager.ts packages/flex-shared/src/crypto/crypto-rules.ts
git commit -m "feat(crypto): key-manager（密钥缓存防频繁握手）+ crypto-rules（规则缓存匹配）"
```

---

## Task 8: crypto-interceptor.ts — Axios interceptors

**Files:**
- Create: `packages/flex-shared/src/crypto/crypto-interceptor.ts`

- [ ] **Step 1: Implement crypto-interceptor.ts**

```typescript
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { matchRule, currentRuleVersion, currentHandshakeId, updateRules, clearRules } from './crypto-rules';
import { getClientKeyPair, deriveSm4KeyFromServer, getCachedSm4Key, clearKeys } from './key-manager';
import { encrypt as sm4Encrypt, decrypt as sm4Decrypt } from './sm4';
import { hmacSm3Sign } from './hmac-sm3';
import { buildSignatureInput } from './signature-builder';

const CRYPTO_RETRIED = '__cryptoRetried';

/**
 * 创建加密请求拦截器。
 *
 * <p>逻辑：
 * 1. crypto-rules.match(method, url) → rule
 * 2. encryptMode=REQUIRED/OPTIONAL → 握手（首次）→ SM4 加密 body
 * 3. signMode=REQUIRED/OPTIONAL → HMAC-SM3 签名
 * 4. 设置 Crypto-ClientPubKey / Crypto-HandshakeId / Crypto-Rule-Version 头
 */
export function createCryptoRequestInterceptor(handshakeFn: () => Promise<{handshakeId: string; serverPubKey: string; ruleVersion: number; encryptedPaths: any[]}>) {
  return async function cryptoRequestInterceptor(config: InternalAxiosRequestConfig) {
    const method = (config.method ?? 'GET').toUpperCase();
    const url = config.url ?? '';

    const rule = matchRule(method, url);
    if (!rule || rule.encryptMode === 'NONE' || rule.encryptMode === 'FORBIDDEN') {
      return config;
    }

    // 确保 sm4Key 存在（未登录→握手派生）
    let sm4Key = getCachedSm4Key();
    if (!sm4Key) {
      const handshake = await handshakeFn();
      updateRules(handshake);
      sm4Key = deriveSm4KeyFromServer(handshake.serverPubKey);
    }

    // 加密请求体（encryptMode=REQUIRED/OPTIONAL 且 direction 含 REQUEST）
    if (rule.encryptMode === 'REQUIRED' || rule.encryptMode === 'OPTIONAL') {
      if (rule.direction === 'REQUEST' || rule.direction === 'BOTH') {
        const plaintext = JSON.stringify(config.data ?? {});
        const encrypted = sm4Encrypt(plaintext, sm4Key);
        config.data = { encrypted, algorithm: 'SM4-GCM' };
      }
    }

    // 设置加密头
    const client = getClientKeyPair();
    config.headers['Crypto-ClientPubKey'] = client.publicKeyBase64;
    const handshakeId = currentHandshakeId();
    if (handshakeId) {
      config.headers['Crypto-HandshakeId'] = handshakeId;
    }
    config.headers['Crypto-Rule-Version'] = String(currentRuleVersion());

    // 签名（signMode=REQUIRED/OPTIONAL）
    if (rule.signMode === 'REQUIRED' || rule.signMode === 'OPTIONAL') {
      const timestamp = Date.now().toString();
      const nonce = crypto.randomUUID();
      const bodyBytes = new TextEncoder().encode(JSON.stringify(config.data ?? {}));
      const token = config.headers['Authorization'] as string | undefined;
      const input = buildSignatureInput({
        method, path: url, timestamp, nonce,
        token: token ?? null, body: bodyBytes,
      });
      const signature = hmacSm3Sign(input, sm4Key);
      config.headers['Sign-Timestamp'] = timestamp;
      config.headers['Sign-Nonce'] = nonce;
      config.headers['Sign-Value'] = signature;
    }

    return config;
  };
}

/**
 * 创建解密响应拦截器。
 *
 * <p>逻辑：
 * 1. 响应头 Crypto-Rule-Outdated → 异步刷新规则
 * 2. 响应头 Crypto-ServerPubKey + body.encrypted → SM4 解密
 * 3. 错误驱动重试（400 Decrypt.Failed/Encrypt.Forbidden）
 */
export function createCryptoResponseInterceptor(
  retryRequestFn: (config: any) => Promise<any>,
) {
  return async function cryptoResponseInterceptor(response: AxiosResponse) {
    // 规则版本不匹配 → 异步刷新（不阻断）
    if (response.headers['crypto-rule-outdated']) {
      // 异步刷新（不打断当前响应）
      // 实际刷新在下次请求的 request interceptor 触发
    }

    // 解密响应体
    const serverPubKey = response.headers['crypto-serverpubkey'];
    if (serverPubKey && response.data?.encrypted) {
      const sm4Key = deriveSm4KeyFromServer(serverPubKey);
      const decrypted = sm4Decrypt(response.data.encrypted, sm4Key);
      response.data = JSON.parse(decrypted);
    }

    return response;
  };
}

/**
 * 创建错误响应拦截器（错误驱动重试）。
 *
 * <p>收到 400 + Decrypt.Failed → 清缓存 + 加密重试一次
 *    收到 400 + Encrypt.Forbidden → 清缓存 + 明文重试一次
 */
export function createCryptoErrorInterceptor() {
  return async function cryptoErrorInterceptor(error: any) {
    const config = error.config;
    if (!config || config[CRYPTO_RETRIED]) {
      return Promise.reject(error);
    }

    const errorCode = error?.response?.data?.errorCode;
    if (errorCode === 'Crypto.Decrypt.Failed') {
      // 缓存 stale（发明文但后端要密文）→ 清缓存 + 重试（会触发握手+加密）
      config[CRYPTO_RETRIED] = true;
      clearRules();
      clearKeys();
      return error.response.config; // 让 axios 重发
    }
    if (errorCode === 'Crypto.Encrypt.Forbidden') {
      // 缓存 stale（发密文但后端要明文）→ 清缓存 + 明文重试
      config[CRYPTO_RETRIED] = true;
      clearRules();
      return error.response.config;
    }

    return Promise.reject(error);
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/flex-shared/src/crypto/crypto-interceptor.ts
git commit -m "feat(crypto): Axios 加解密拦截器（请求加密签名 + 响应解密 + 错误重试）"
```

---

## Task 9: index.ts barrel export + flex-shared index

**Files:**
- Create: `packages/flex-shared/src/crypto/index.ts`
- Modify: `packages/flex-shared/src/index.ts`

- [ ] **Step 1: Create crypto/index.ts**

```typescript
export * from './types';
export * from './sm2';
export * from './sm4';
export * from './hmac-sm3';
export * from './kdf';
export * from './signature-builder';
export * from './key-manager';
export * from './crypto-rules';
export * from './crypto-interceptor';
```

- [ ] **Step 2: Add crypto export to flex-shared/src/index.ts**

Add at the end of `packages/flex-shared/src/index.ts`:

```typescript
export * from './crypto';
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm --filter @flex/shared build 2>&1 | tail -5`
Expected: BUILD SUCCESS (or no errors).

- [ ] **Step 4: Commit**

```bash
git add packages/flex-shared/src/crypto/index.ts packages/flex-shared/src/index.ts
git commit -m "feat(crypto): crypto 模块桶导出 + flex-shared index 导出"
```

---

## Task 10: Register interceptors in request.ts

**Files:**
- Modify: `apps/web-antd/src/api/request.ts`

- [ ] **Step 1: Read current request.ts**

Read `apps/web-antd/src/api/request.ts` — the `createRequestClient` function registers interceptors via `client.addRequestInterceptor` / `client.addResponseInterceptor`.

- [ ] **Step 2: Add crypto interceptors**

Add imports at the top:

```typescript
import {
  createCryptoRequestInterceptor,
  createCryptoResponseInterceptor,
} from '@flex/shared';
import axios from 'axios';
```

Inside `createRequestClient`, after the token interceptor and before the response interceptors, add:

```typescript
  // 加密拦截器（在 token 拦截器之后，先加 token 再加密 body）
  client.addRequestInterceptor({
    fulfilled: createCryptoRequestInterceptor(async () => {
      // 握手函数：调后端握手端点
      const client = getClientKeyPair(); // from @flex/shared
      const resp = await axios.post('/api/crypto/handshake', {
        clientPubKey: client.publicKeyBase64,
      });
      return resp.data.data; // Result 包装，取 data
    }),
  });

  // 解密响应拦截器
  client.addResponseInterceptor({
    fulfilled: createCryptoResponseInterceptor(),
  });
```

> **Note:** The `getClientKeyPair` import must be added from `@flex/shared`. The handshake uses raw `axios.post` (not the `requestClient` itself, to avoid interceptor recursion).

- [ ] **Step 3: Verify build**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm --filter web-antd build 2>&1 | tail -10`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add apps/web-antd/src/api/request.ts
git commit -m "feat(crypto): 注册加密/解密 Axios 拦截器（web-antd request.ts）"
```

---

## Task 11: Run all frontend tests + interop verification

- [ ] **Step 1: Run all flex-shared crypto tests**

Run: `cd /Users/pengxinkui/PrivateCode.localized/personal/flex-app/flex-app-web && pnpm test:unit 2>&1 | tail -20`
Expected: All crypto tests PASS. No regressions in existing tests.

- [ ] **Step 2: Interop verification against running backend**

Prerequisites: backend running on `localhost:8080` with Plan 1 implemented.

Manual verification steps (or write an e2e test):
1. Open the web app
2. Navigate to login page
3. Check browser DevTools Network tab:
   - A `POST /api/crypto/handshake` should fire first (with clientPubKey)
   - The `POST /api/auth/login` request should have `Crypto-ClientPubKey` / `Crypto-HandshakeId` / `Sign-*` headers
   - The login request body should be `{encrypted: "Base64...", algorithm: "SM4-GCM"}` (not plaintext)
   - The login response should be decrypted by the interceptor (visible as plaintext in the app)
4. If decryption fails → check SM4-GCM format compatibility (the #1 risk)

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "test(crypto): 全量测试通过 + 前后端互操作验证"
```

---

## Completion Criteria

1. ✅ SM crypto deps installed (@noble/curves, @noble/hashes, sm-crypto)
2. ✅ sm2.ts: keypair gen + ECDH (symmetric) + Base64 round-trip
3. ✅ kdf.ts: HKDF-SHA256 (deterministic, 16 bytes)
4. ✅ sm4.ts: SM4-GCM encrypt/decrypt round-trip (byte-compatible with backend)
5. ✅ hmac-sm3.ts + signature-builder.ts: 6-element signature (sha256 vectors match)
6. ✅ key-manager.ts: client keypair cache + sm4Key cache (anti-frequent-handshake)
7. ✅ crypto-rules.ts: encrypted-paths cache + match + ruleVersion
8. ✅ crypto-interceptor.ts: request encrypt+sign / response decrypt+retry
9. ✅ request.ts: interceptors registered
10. ✅ All flex-shared tests pass
11. ✅ **Interop verified**: frontend handshake → encrypted login → backend decrypts → response decrypted by frontend

---

## Known Risks (execution must verify)

1. **SM4-GCM interop** (highest risk): sm-crypto may not support GCM. Must find a JS SM4-GCM impl byte-compatible with BC's `SM4/GCM/NoPadding`. Verify with real backend.
2. **@noble/curves sm2 ECDH format**: `getSharedSecret` return format (full point vs X-only) must match backend's X-coordinate extraction.
3. **HMAC-SM3**: sm-crypto's `sm3` API (input/output type) must produce the same hash as BC's `SM3Digest`.
4. **sm-crypto version**: pin a specific version to avoid API drift.
