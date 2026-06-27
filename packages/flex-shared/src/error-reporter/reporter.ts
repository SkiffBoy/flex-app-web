interface ErrorRecord {
  err: Error;
  pluginId: string;
  timestamp: number;
}

const queue: ErrorRecord[] = [];
const dedupe = new Set<string>();

/**
 * 插件异常上报（X 决策：本轮 console + 去重队列，真实 POST 留接口）。
 * @param err 异常对象
 * @param pluginId 插件 id（用于归属）
 */
export function reportError(err: Error, pluginId: string): void {
  const key = `${pluginId}:${err.message}`;
  if (dedupe.has(key)) {
    return; // 相同 message 去重
  }
  dedupe.add(key);
  queue.push({ pluginId, err, timestamp: Date.now() });
  console.error(`[plugin:${pluginId}]`, err);
  // TODO(auth 落地后): 批量 POST /api/plugin-errors
}

/** 供调试/未来上报使用：获取当前队列 */
export function getErrorQueue(): ErrorRecord[] {
  return [...queue];
}

/** 清空队列（测试用） */
export function clearErrorQueue(): void {
  queue.length = 0;
  dedupe.clear();
}
