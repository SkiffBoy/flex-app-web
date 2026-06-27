import smCrypto from 'sm-crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { BigInteger } = require('jsbn');
const sm2Utils = require('sm-crypto/src/sm2/utils');
const smCryptoSm2 = smCrypto.sm2;

/**
 * SM2 密钥对生成 + ECDH + 原始点 Base64 编解码（基于 sm-crypto）。
 *
 * 使用 sm-crypto 的 sm2p256v1 曲线（与后端 BouncyCastle 一致）。
 * 公钥编码：未压缩原始点 0x04‖X(32)‖Y(32) → Base64。
 * 私钥编码：32 字节大端标量（十六进制 64 字符）。
 *
 * sm-crypto 内部用 BigInteger 椭圆曲线点运算，{@code point.multiply(scalar)} 是 ECDH 的基础。
 */

/** 生成 SM2 临时密钥对。 */
export function generateKeyPair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const kp = smCryptoSm2.generateKeyPairHex();
  return {
    privateKey: hexToBytes(kp.privateKey),
    publicKey: hexToBytes(kp.publicKey),
  };
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
 * sharedSecret = peerPublicKey.multiply(myPrivateKey).x
 * 后端 BC ECDHBasicAgreement 返回 x 坐标（32 字节）。
 *
 * @param myPrivateKey 我方私钥（32 字节标量）
 * @param peerPublicKey 对方公钥（65 字节未压缩点）
 * @returns 共享密钥（32 字节 x 坐标）
 */
export function agree(myPrivateKey: Uint8Array, peerPublicKey: Uint8Array): Uint8Array {
  const privHex = bytesToHex(myPrivateKey);
  const pubHex = bytesToHex(peerPublicKey);

  const curve = sm2Utils.getGlobalCurve();
  const point = curve.decodePointHex(pubHex);
  const scalar = new BigInteger(privHex, 16);
  const shared = point.multiply(scalar);
  const xHex = shared.getX().toBigInteger().toString(16);

  return hexToBytes(xHex.padStart(64, '0'));
}

// ===== 工具函数 =====

function hexToBytes(hex: string): Uint8Array {
  const padded = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
