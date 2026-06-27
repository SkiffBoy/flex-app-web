import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { clearRules, currentHandshakeId, currentRuleVersion, matchRule, updateRules } from './crypto-rules';
import { decrypt as sm4Decrypt, encrypt as sm4Encrypt } from './sm4';
import { buildSignatureInput } from './signature-builder';
import { clearKeys, deriveSm4KeyFromServer, getCachedSm4Key, getClientKeyPair } from './key-manager';
import { hmacSm3Sign } from './hmac-sm3';
import type { HandshakeResponse } from './types';

const CRYPTO_RETRIED = '__cryptoRetried';

type HandshakeFn = () => Promise<HandshakeResponse>;

/**
 * 创建加密请求拦截器。
 *
 * 逻辑：
 * 1. crypto-rules.match(method, url) → rule
 * 2. encryptMode=REQUIRED/OPTIONAL → 握手（首次）→ SM4 加密 body
 * 3. signMode=REQUIRED/OPTIONAL → HMAC-SM3 签名
 * 4. 设置 Crypto-ClientPubKey / Crypto-HandshakeId / Crypto-Rule-Version 头
 */
export function createCryptoRequestInterceptor(handshakeFn: HandshakeFn) {
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

    // 加密请求体（encryptMode=REQUIRED/OPTIONAL 且 direction 含 REQUEST/BOTH）
    const needsEncryptBody =
      rule.encryptMode === 'REQUIRED' || rule.encryptMode === 'OPTIONAL';
    if (needsEncryptBody && (rule.direction === 'REQUEST' || rule.direction === 'BOTH')) {
      const plaintext = JSON.stringify(config.data ?? {});
      const encrypted = sm4Encrypt(plaintext, sm4Key);
      config.data = { encrypted, algorithm: 'SM4-GCM' };
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
      const token = (config.headers.Authorization as string | undefined) ?? null;
      const input = buildSignatureInput({
        method,
        path: url,
        timestamp,
        nonce,
        token,
        body: bodyBytes,
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
 * 逻辑：
 * 1. 响应头 Crypto-Rule-Outdated → 异步刷新规则（不阻断）
 * 2. 响应头 Crypto-ServerPubKey + body.encrypted → SM4 解密
 */
export function createCryptoResponseInterceptor() {
  return async function cryptoResponseInterceptor(response: AxiosResponse) {
    // 规则版本不匹配 → 标记待刷新（下次请求的 request interceptor 会重新握手）
    if (response.headers['crypto-rule-outdated']) {
      clearRules();
      clearKeys();
    }

    // 解密响应体
    const serverPubKey = response.headers['crypto-serverpubkey'] as string | undefined;
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
 * 收到 400 + Decrypt.Failed → 清缓存 + 重试（触发握手+加密）
 * 收到 400 + Encrypt.Forbidden → 清缓存 + 明文重试
 * 只重试一次（防循环）。
 */
export function createCryptoErrorInterceptor() {
  return async function cryptoErrorInterceptor(error: any) {
    const config = error?.config;
    if (!config || config[CRYPTO_RETRIED]) {
      return Promise.reject(error);
    }

    const errorCode = error?.response?.data?.errorCode;
    if (errorCode === 'Crypto.Decrypt.Failed') {
      config[CRYPTO_RETRIED] = true;
      clearRules();
      clearKeys();
      // 删除加密头，让重试重新走握手+加密
      delete config.headers['Crypto-HandshakeId'];
      delete config.headers['Crypto-Rule-Version'];
      return Promise.reject(error); // axios 重试需在上层处理
    }
    if (errorCode === 'Crypto.Encrypt.Forbidden') {
      config[CRYPTO_RETRIED] = true;
      clearRules();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  };
}
