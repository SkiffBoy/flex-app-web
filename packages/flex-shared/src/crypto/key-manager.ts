import { deriveSm4Key } from './kdf';
import { agree, decodePublicKeyBase64, encodePublicKeyBase64, generateKeyPair } from './sm2';
import type { ClientKeyMaterial } from './types';

/**
 * 密钥管理器（内存缓存，防频繁握手）。
 *
 * 未登录：client 密钥对生成一次（内存固定），sm4Key 从握手派生缓存。
 * 已登录：从响应头 serverPubKey 派生 sm4Key。
 */

let clientKeyPair: ClientKeyMaterial | null = null;
let cachedSm4Key: Uint8Array | null = null;
let cachedServerPubKeyB64: string | null = null;

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

/** 从 serverPubKey 派生 sm4Key（缓存：同一 serverPubKey 复用）。 */
export function deriveSm4KeyFromServer(serverPubKeyBase64: string): Uint8Array {
  if (cachedSm4Key && cachedServerPubKeyB64 === serverPubKeyBase64) {
    return cachedSm4Key;
  }
  const client = getClientKeyPair();
  const serverPub = decodePublicKeyBase64(serverPubKeyBase64);
  const shared = agree(client.privateKey, serverPub);
  cachedSm4Key = deriveSm4Key(shared);
  cachedServerPubKeyB64 = serverPubKeyBase64;
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
  cachedServerPubKeyB64 = null;
}
