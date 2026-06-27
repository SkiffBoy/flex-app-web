/**
 * SSE composable 适配层（re-export @flex/shared/sse，自动注入 token）。
 *
 * <p>SharedWorker 模式：N 个 tab 共享 1 条 SSE 连接（由 worker 持有）。
 * 此文件保持原有 useSSE() 签名向下兼容（connect() 无参），内部从 accessStore 取 token。
 */
import { useAccessStore } from '@vben/stores';

import { useSSE as useSseCore } from '@flex/shared/sse';

// 重命名以避免与本地 useSSE 冲突（核心实现来自 @flex/shared/sse）
const sseCore = useSseCore();

/**
 * App 级 useSSE：connect() 时自动注入当前 accessToken（无需调用方传 token）。
 * 其余 API（on/subscribe/disconnect/connected）透传 @flex/shared/sse。
 */
export function useSSE() {
  return {
    /** 建立连接（自动取 accessStore.accessToken 传给 worker）。幂等。 */
    connect: () => {
      const accessStore = useAccessStore();
      const token = accessStore.accessToken;
      if (token) {
        sseCore.connect(token);
      }
    },
    connected: sseCore.connected,
    disconnect: sseCore.disconnect,
    getSessionId: sseCore.getSessionId,
    on: sseCore.on,
    subscribe: sseCore.subscribe,
  };
}
