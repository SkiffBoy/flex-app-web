declare module 'sm-crypto' {
  export const sm2: {
    generateKeyPairHex: () => { privateKey: string; publicKey: string };
    compressPublicKeyHex: (pubHex: string) => string;
    comparePublicKeyHex: (a: string, b: string) => boolean;
    doEncrypt: (msg: string | number[], publicKey: string, cipherMode?: number) => string;
    doDecrypt: (encryptData: string, privateKey: string, cipherMode?: number) => string;
    doSignature: (msg: string | number[], privateKey: string, options?: any) => string;
    doVerifySignature: (
      msg: string | number[],
      sigHex: string,
      publicKey: string,
      options?: any,
    ) => boolean;
    getPublicKeyFromPrivateKey: (privateKey: string) => string;
    getPoint: () => { k: any; x1: any; privateKey: string; publicKey: string };
  };
  export function sm3(input: string | ArrayLike<number>): string;
  export const sm4: {
    encrypt: (
      inArray: string | number[],
      key: string,
      options?: {
        iv?: number[];
        mode?: string;
        padding?: string;
        output?: 'array' | 'string';
      },
    ) => string | number[];
    decrypt: (
      inArray: string | number[],
      key: string,
      options?: {
        iv?: number[];
        mode?: string;
        padding?: string;
        output?: 'array' | 'string';
      },
    ) => string | number[];
  };
}

declare module 'sm-crypto/src/sm2/utils' {
  export function getGlobalCurve(): any;
  export function generateEcparam(): { curve: any; G: any; n: any };
}

declare module 'jsbn' {
  export class BigInteger {
    constructor(a: string | number, b?: number);
    toString(radix?: number): string;
    modInverse(n: BigInteger): BigInteger;
    multiply(n: BigInteger): BigInteger;
    add(n: BigInteger): BigInteger;
    subtract(n: BigInteger): BigInteger;
    mod(n: BigInteger): BigInteger;
  }
}
