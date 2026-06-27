/**
 * SSE SharedWorker 消息协议类型（tab ↔ worker）。
 *
 * <p>架构：N 个 tab 共享 1 条 SSE 连接（由 SharedWorker 持有），worker 内按 channel
 * 路由事件给订阅了它的 tab。
 *
 * <p>所有事件的 channel 来自 SSE 复合 id 帧（id 格式 "channel:seq"），由 worker 解析。
 * - 用户级广播域（user:/role:/broadcast/session: 前缀）→ 广播所有 tab
 * - 显式按源 channel（如 task:123）→ 仅路由给订阅了该 channel 的 tab
 */

// ============ Tab → Worker ============

/** Tab 连接 worker 时初始化（透传认证 token，worker 用于 fetch ticket）。 */
export interface InitMessage {
  type: 'INIT';
  token: string;
}

/** 订阅 channel（增量同步到后端）。 */
export interface SubscribeMessage {
  type: 'SUBSCRIBE';
  channels: string[];
}

/** 取消订阅 channel。 */
export interface UnsubscribeMessage {
  type: 'UNSUBSCRIBE';
  channels: string[];
}

/** 监听命名事件（worker 据此对 EventSource 动态注册 addEventListener）。 */
export interface ListenMessage {
  type: 'LISTEN';
  events: string[];
}

/** Tab 关闭/卸载通知（worker 据此清理 port + 重算订阅集合）。 */
export interface CloseMessage {
  type: 'CLOSE';
}

export type TabToWorkerMessage =
  | CloseMessage
  | InitMessage
  | ListenMessage
  | SubscribeMessage
  | UnsubscribeMessage;

// ============ Worker → Tab ============

/** SSE 事件下发。channel 来自复合 id 帧（用户级事件为 user:1001 等，按源事件为 task:123 等）。 */
export interface EventMessage {
  type: 'EVENT';
  channel: null | string;
  event: string;
  data: unknown;
  seq: number;
}

/** SSE 连接状态变化（建连/断开/重连中）。 */
export interface StateMessage {
  type: 'STATE';
  connected: boolean;
}

/** Worker 建连后回报 sessionId（供前端管理 Last-Event-ID）。 */
export interface SessionMessage {
  type: 'SESSION';
  sessionId: string;
}

export type WorkerToTabMessage =
  | EventMessage
  | SessionMessage
  | StateMessage;
