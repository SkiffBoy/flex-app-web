/**
 * 加密规则（前端从握手响应获取，缓存匹配用）。
 */
export interface CryptoRule {
  method: string;
  path: string;
  encryptMode: 'FORBIDDEN' | 'NONE' | 'OPTIONAL' | 'REQUIRED';
  signMode: 'NONE' | 'OPTIONAL' | 'REQUIRED';
  direction: 'BOTH' | 'REQUEST' | 'RESPONSE';
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

/**
 * 签名输入参数。
 */
export interface SignInputParams {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  token: null | string;
  body: Uint8Array;
}
