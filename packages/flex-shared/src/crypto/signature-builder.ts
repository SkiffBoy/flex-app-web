import { sha256 } from '@noble/hashes/sha2.js';

import type { SignInputParams } from './types';

/**
 * 构建增强签名输入（对齐后端 SignatureInputBuilder §4.1）。
 *
 * 格式：METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + TOKEN + "\n" + SHA256(body)
 */
export function buildSignatureInput(params: SignInputParams): string {
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
