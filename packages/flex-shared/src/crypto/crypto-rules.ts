import type { CryptoRule, HandshakeResponse } from './types';

/**
 * 加密规则缓存（从握手响应获取，前端匹配用）。
 *
 * 缓存 encryptedPaths + ruleVersion，请求前查匹配。
 * 收到 Crypto-Rule-Outdated 头时触发刷新。
 */

let cachedRules: CryptoRule[] = [];
let cachedRuleVersion = 0;
let cachedHandshake: HandshakeResponse | null = null;

/** 更新缓存（握手后调用）。 */
export function updateRules(handshake: HandshakeResponse): void {
  cachedHandshake = handshake;
  cachedRules = handshake.encryptedPaths ?? [];
  cachedRuleVersion = handshake.ruleVersion;
}

/** 匹配规则（method + path）。 */
export function matchRule(method: string, path: string): CryptoRule | null {
  const upperMethod = method.toUpperCase();
  for (const rule of cachedRules) {
    if (
      (rule.method === '*' || rule.method.toUpperCase() === upperMethod)
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

/** 清缓存（规则变更重试时）。 */
export function clearRules(): void {
  cachedRules = [];
  cachedRuleVersion = 0;
  cachedHandshake = null;
}

/** 简单路径匹配（支持 * 通配，与后端 AntPathMatcher 基本对齐）。 */
function pathMatches(pattern: string, path: string): boolean {
  if (pattern === '/**' || pattern === path) return true;
  if (pattern.endsWith('/**')) {
    return path.startsWith(pattern.slice(0, -3));
  }
  return false;
}
