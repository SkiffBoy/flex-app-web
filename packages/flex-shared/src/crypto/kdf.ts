import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

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
