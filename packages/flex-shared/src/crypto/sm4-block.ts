/**
 * 标准 SM4 分组密码（GB/T 32907-2016）— 纯 JS 实现。
 *
 * sm-crypto 的 SM4 轮函数与标准有差异（S-box 相同但 L 变换不同），
 * 故本文件实现标准 SM4 单块加解密，作为 SM4-GCM 的底层分组密码。
 *
 * 算法：32 轮 Feistel + 非线性变换 τ（S-box）+ 线性变换 L。
 */

// 标准 SM4 S-box
const SBOX = [
  0xD6, 0x90, 0xE9, 0xFE, 0xCC, 0xE1, 0x3D, 0xB7, 0x16, 0xB6, 0x14, 0xC2, 0x28,
  0xFB, 0x2C, 0x05, 0x2B, 0x67, 0x9A, 0x76, 0x2A, 0xBE, 0x04, 0xC3, 0xAA, 0x44,
  0x13, 0x26, 0x49, 0x86, 0x06, 0x99, 0x9C, 0x42, 0x50, 0xF4, 0x91, 0xEF, 0x98,
  0x7A, 0x33, 0x54, 0x0B, 0x43, 0xED, 0xCF, 0xAC, 0x62, 0xE4, 0xB3, 0x1C, 0xA9,
  0xC9, 0x08, 0xE8, 0x95, 0x80, 0xDF, 0x94, 0xFA, 0x75, 0x8F, 0x3F, 0xA6, 0x47,
  0x07, 0xA7, 0xFC, 0xF3, 0x73, 0x17, 0xBA, 0x83, 0x59, 0x3C, 0x19, 0xE6, 0x85,
  0x4F, 0xA8, 0x68, 0x6B, 0x81, 0xB2, 0x71, 0x64, 0xDA, 0x8B, 0xF8, 0xEB, 0x0F,
  0x4B, 0x70, 0x56, 0x9D, 0x35, 0x1E, 0x24, 0x0E, 0x5E, 0x63, 0x58, 0xD1, 0xA2,
  0x25, 0x22, 0x7C, 0x3B, 0x01, 0x21, 0x78, 0x87, 0xD4, 0x00, 0x46, 0x57, 0x9F,
  0xD3, 0x27, 0x52, 0x4C, 0x36, 0x02, 0xE7, 0xA0, 0xC4, 0xC8, 0x9E, 0xEA, 0xBF,
  0x8A, 0xD2, 0x40, 0xC7, 0x38, 0xB5, 0xA3, 0xF7, 0xF2, 0xCE, 0xF9, 0x61, 0x15,
  0xA1, 0xE0, 0xAE, 0x5D, 0xA4, 0x9B, 0x34, 0x1A, 0x55, 0xAD, 0x93, 0x32, 0x30,
  0xF5, 0x8C, 0xB1, 0xE3, 0x1D, 0xF6, 0xE2, 0x2E, 0x82, 0x66, 0xCA, 0x60, 0xC0,
  0x29, 0x23, 0xAB, 0x0D, 0x53, 0x4E, 0x6F, 0xD5, 0xDB, 0x37, 0x45, 0xDE, 0xFD,
  0x8E, 0x2F, 0x03, 0xFF, 0x6A, 0x72, 0x6D, 0x6C, 0x5B, 0x51, 0x8D, 0x1B, 0xAF,
  0x92, 0xBB, 0xDD, 0xBC, 0x7F, 0x11, 0xD9, 0x5C, 0x41, 0x1F, 0x10, 0x5A, 0xD8,
  0x0A, 0xC1, 0x31, 0x88, 0xA5, 0xCD, 0x7B, 0xBD, 0x2D, 0x74, 0xD0, 0x12, 0xB8,
  0xE5, 0xB4, 0xB0, 0x89, 0x69, 0x97, 0x4A, 0x0C, 0x96, 0x77, 0x7E, 0x65, 0xB9,
  0xF1, 0x09, 0xC5, 0x6E, 0xC6, 0x84, 0x18, 0xF0, 0x7D, 0xEC, 0x3A, 0xDC, 0x4D,
  0x20, 0x79, 0xEE, 0x5F, 0x3E, 0xD7, 0xCB, 0x39, 0x48,
];

// 系统参数 FK
const FK = [0xA3_B1_BA_C6, 0x56_AA_33_50, 0x67_7D_91_97, 0xB2_70_22_DC];

// 固定参数 CK
const CK = [
  0x00_07_0E_15, 0x1C_23_2A_31, 0x38_3F_46_4D, 0x54_5B_62_69, 0x70_77_7E_85, 0x8C_93_9A_A1,
  0xA8_AF_B6_BD, 0xC4_CB_D2_D9, 0xE0_E7_EE_F5, 0xFC_03_0A_11, 0x18_1F_26_2D, 0x34_3B_42_49,
  0x50_57_5E_65, 0x6C_73_7A_81, 0x88_8F_96_9D, 0xA4_AB_B2_B9, 0xC0_C7_CE_D5, 0xDC_E3_EA_F1,
  0xF8_FF_06_0D, 0x14_1B_22_29, 0x30_37_3E_45, 0x4C_53_5A_61, 0x68_6F_76_7D, 0x84_8B_92_99,
  0xA0_A7_AE_B5, 0xBC_C3_CA_D1, 0xD8_DF_E6_ED, 0xF4_FB_02_09, 0x10_17_1E_25, 0x2C_33_3A_41,
  0x48_4F_56_5D, 0x64_6B_72_79,
];

/** 循环左移 */
function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

/**
 * S-box 查表：索引经 `& 0xff` 后落在 [0, 255]，SBOX 长度恰为 256，
 * 故结果恒有效。用 `?? 0` 兜底以满足 noUncheckedIndexedAccess（索引恒在范围内，
 * 该分支实际不可达），避免使用被 no-non-null-assertion 禁止的 `!`。
 */
function sbox(b: number): number {
  return SBOX[b & 0xFF] ?? 0;
}

/**
 * 从 16 字节数组读取大端 32 位字（高字节在前）。
 * 调用方需保证 buf 长度为 16（见各函数入口断言），故索引 0–15 恒有效。
 */
function readWord(buf: Uint8Array, wordIdx: number): number {
  const i = wordIdx * 4;
  return (
    (((buf[i] ?? 0) << 24) |
      ((buf[i + 1] ?? 0) << 16) |
      ((buf[i + 2] ?? 0) << 8) |
      (buf[i + 3] ?? 0)) >>>
    0
  );
}

/** 非线性变换 τ（字节级 S-box） */
function tau(a: number): number {
  return (
    ((sbox(a >>> 24) << 24) |
      (sbox(a >>> 16) << 16) |
      (sbox(a >>> 8) << 8) |
      sbox(a)) >>>
    0
  );
}

/** 线性变换 L */
function L(b: number): number {
  return (b ^ rotl(b, 2) ^ rotl(b, 10) ^ rotl(b, 18) ^ rotl(b, 24)) >>> 0;
}

/** 线性变换 L'（密钥扩展用） */
function LPrime(b: number): number {
  return (b ^ rotl(b, 13) ^ rotl(b, 23)) >>> 0;
}

/** 合成置换 T = L(τ(.)) */
function T(x: number): number {
  return L(tau(x));
}

/** 合成置换 T' = L'(τ(.))（密钥扩展用） */
function TPrime(x: number): number {
  return LPrime(tau(x));
}

/** 密钥扩展：16 字节 key → 32 个轮密钥 */
function keyExpansion(key: Uint8Array): Uint32Array {
  if (key.length !== 16) {
    throw new Error(`SM4 key must be 16 bytes, got ${key.length}`);
  }

  const mk = new Uint32Array(4);
  for (let i = 0; i < 4; i++) {
    mk[i] = readWord(key, i);
  }

  const k = new Uint32Array(36);
  k[0] = ((mk[0] ?? 0) ^ (FK[0] ?? 0)) >>> 0;
  k[1] = ((mk[1] ?? 0) ^ (FK[1] ?? 0)) >>> 0;
  k[2] = ((mk[2] ?? 0) ^ (FK[2] ?? 0)) >>> 0;
  k[3] = ((mk[3] ?? 0) ^ (FK[3] ?? 0)) >>> 0;

  const rk = new Uint32Array(32);
  for (let i = 0; i < 32; i++) {
    // 注意：TPrime 的参数只含 k[i+1..3] ^ CK[i]，k[i] 在外层异或
    const t =
      ((k[i + 1] ?? 0) ^ (k[i + 2] ?? 0) ^ (k[i + 3] ?? 0) ^ (CK[i] ?? 0)) >>>
      0;
    k[i + 4] = ((k[i] ?? 0) ^ TPrime(t)) >>> 0;
    rk[i] = k[i + 4] ?? 0;
  }
  return rk;
}

/**
 * SM4 单块加密（16 字节 → 16 字节）。
 *
 * @param key 16 字节密钥
 * @param input 16 字节明文
 * @returns 16 字节密文
 */
export function encryptBlock(key: Uint8Array, input: Uint8Array): Uint8Array {
  if (input.length !== 16) {
    throw new Error(`SM4 block must be 16 bytes, got ${input.length}`);
  }
  const rk = keyExpansion(key);
  const x = new Uint32Array(36);
  for (let i = 0; i < 4; i++) {
    x[i] = readWord(input, i);
  }

  for (let i = 0; i < 32; i++) {
    // 注意：T 的参数只含 x[i+1..3] ^ rk[i]，x[i] 在外层异或
    const t =
      ((x[i + 1] ?? 0) ^ (x[i + 2] ?? 0) ^ (x[i + 3] ?? 0) ^ (rk[i] ?? 0)) >>>
      0;
    x[i + 4] = ((x[i] ?? 0) ^ T(t)) >>> 0;
  }

  // 反序变换 R
  const output = new Uint8Array(16);
  const y = [x[35] ?? 0, x[34] ?? 0, x[33] ?? 0, x[32] ?? 0];
  for (let i = 0; i < 4; i++) {
    const yi = y[i] ?? 0;
    output[i * 4] = (yi >>> 24) & 0xFF;
    output[i * 4 + 1] = (yi >>> 16) & 0xFF;
    output[i * 4 + 2] = (yi >>> 8) & 0xFF;
    output[i * 4 + 3] = yi & 0xFF;
  }
  return output;
}

/**
 * SM4 单块解密（16 字节 → 16 字节）。
 * 解密与加密相同，但轮密钥逆序。
 */
export function decryptBlock(key: Uint8Array, input: Uint8Array): Uint8Array {
  if (input.length !== 16) {
    throw new Error(`SM4 block must be 16 bytes, got ${input.length}`);
  }
  const rk = keyExpansion(key);
  const rkRev = new Uint32Array(32);
  for (let i = 0; i < 32; i++) {
    rkRev[i] = rk[31 - i] ?? 0;
  }

  const x = new Uint32Array(36);
  for (let i = 0; i < 4; i++) {
    x[i] = readWord(input, i);
  }

  for (let i = 0; i < 32; i++) {
    // 注意：T 的参数只含 x[i+1..3] ^ rkRev[i]，x[i] 在外层异或
    const t =
      ((x[i + 1] ?? 0) ^
        (x[i + 2] ?? 0) ^
        (x[i + 3] ?? 0) ^
        (rkRev[i] ?? 0)) >>>
      0;
    x[i + 4] = ((x[i] ?? 0) ^ T(t)) >>> 0;
  }

  const output = new Uint8Array(16);
  const y = [x[35] ?? 0, x[34] ?? 0, x[33] ?? 0, x[32] ?? 0];
  for (let i = 0; i < 4; i++) {
    const yi = y[i] ?? 0;
    output[i * 4] = (yi >>> 24) & 0xFF;
    output[i * 4 + 1] = (yi >>> 16) & 0xFF;
    output[i * 4 + 2] = (yi >>> 8) & 0xFF;
    output[i * 4 + 3] = yi & 0xFF;
  }
  return output;
}
