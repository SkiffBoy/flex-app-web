/**
 * SSE tab 侧客户端封装（连 SharedWorker + 事件/channel 订阅 API）。
 *
 * <p>向下兼容现有 {@code useSSE().on(event, handler)} 接口，新增 {@code subscribe(channels)}。
 * 内部维护单例 SharedWorker 连接 + 事件 listener Map。
 */
import { ref, type Ref } from 'vue';

import type { TabToWorkerMessage, WorkerToTabMessage } from './types';

type EventHandler = (data: any) => void;

// ============ 单例状态（全 app 共享） ============
let worker: SharedWorker | null = null;
let workerPort: MessagePort | null = null;
const connected: Ref<boolean> = ref(false);
let sessionId = '';

/** event name → handlers（用户级事件订阅）。 */
const listeners = new Map<string, Set<EventHandler>>();

/** 确保 worker 已连接（懒初始化，幂等）。 */
function ensureWorker(): MessagePort | null {
  if (workerPort) return workerPort;
  try {
    // SharedWorker 由 Vite 打包；new URL 形式确保产物路径正确
    worker = new SharedWorker(
      new URL('./sse-worker.ts', import.meta.url),
      { name: 'flex-sse', type: 'module' },
    );
    workerPort = worker.port;
    workerPort.onmessage = (e: MessageEvent) =>
      handleWorkerMessage(e.data as WorkerToTabMessage);
    workerPort.start();
    // 监听 worker 异常
    worker.onerror = (e) => {
      console.warn('[flex-sse] worker error', e.message);
    };
  } catch (e) {
    console.warn('[flex-sse] SharedWorker 不可用，降级为每 tab 直连', e);
    return null;
  }
  return workerPort;
}

/** worker → tab 消息处理。 */
function handleWorkerMessage(msg: WorkerToTabMessage) {
  switch (msg.type) {
    case 'STATE': {
      connected.value = msg.connected;
      break;
    }
    case 'SESSION': {
      sessionId = msg.sessionId;
      break;
    }
    case 'EVENT': {
      // 按 event 名分发到本地 listener
      const handlers = listeners.get(msg.event);
      if (handlers) {
        handlers.forEach((h) => h(msg.data));
      }
      break;
    }
  }
}

/** 向 worker 发消息。 */
function postToWorker(msg: TabToWorkerMessage) {
  const port = ensureWorker();
  if (port) port.postMessage(msg);
}

// ============ 公开 API（对齐现有 use-sse.ts） ============

/** 初始化 SSE 连接（透传认证 token 给 worker）。幂等。 */
function connect(token: string) {
  postToWorker({ type: 'INIT', token });
}

/** 订阅命名事件，返回取消订阅函数。 */
function on(event: string, handler: EventHandler): () => void {
  // 首次监听该 event 时通知 worker 注册 EventSource listener
  if (!listeners.has(event) || listeners.get(event)!.size === 0) {
    postToWorker({ type: 'LISTEN', events: [event] });
  }
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

/** 订阅 channel（按源事件，如日志流 task:123），返回取消订阅函数。 */
function subscribe(channels: string[]): () => void {
  postToWorker({ type: 'SUBSCRIBE', channels });
  return () => {
    postToWorker({ type: 'UNSUBSCRIBE', channels });
  };
}

/** 断开（登出/卸载用）。 */
function disconnect() {
  postToWorker({ type: 'CLOSE' });
  listeners.clear();
  connected.value = false;
}

/** 获取当前 sessionId（建连后由 worker 回报）。 */
function getSessionId(): string {
  return sessionId;
}

export function useSSE() {
  return {
    connect,
    connected,
    disconnect,
    getSessionId,
    on,
    subscribe,
  };
}
