/**
 * SSE SharedWorker —— 浏览器内唯一的 SSE 连接 owner。
 *
 * <p>核心职责：
 * <ol>
 *   <li>持有唯一 EventSource（票据握手：fetch /sse/ticket → GET /sse/connect?ticket=）</li>
 *   <li>维护每个 tab（MessagePort）的订阅集合（channel + event 名）</li>
 *   <li>收到 SSE 命名事件 → 从复合 id 帧（channel:seq）解析 channel → 路由给订阅的 tab</li>
 *   <li>tab 关闭 → 清理 port + 重算订阅 + 增量同步后端</li>
 *   <li>最后一个 port 断开 → 关闭 EventSource</li>
 *   <li>EventSource 断开 → 指数退避重连 → 重连后重新注册 listener + 按 channelSeqMap 回传 resume</li>
 * </ol>
 *
 * <p><b>命名事件监听</b>：EventSource 的命名事件（如 notification.new）需 addEventListener
 * 逐个注册，无 catch-all。故 tab 调 LISTEN 时把 event 名告诉 worker，worker 对 EventSource
 * 动态注册（去重）；重连后按 allEvents 重新注册。
 *
 * <p><b>channel 路由</b>：所有事件的 channel 来自 SSE 复合 id 帧（id 格式 "channel:seq"，
 * 由 compound-id.ts 的 parseCompoundId 解析），而非 data 内字段。
 * - 用户级广播域（user:/role:/broadcast/session: 前缀）→ 广播所有 tab
 * - 显式按源 channel（如 task:123 / qr:abc）→ 仅路由给订阅了该 channel 的 tab
 *
 * <p><b>断点续传</b>：每收到一条事件，更新 channelSeqMap[channel]=seq；重连时 buildResumeParam
 * 把它拼成 ?resume=channel:seq,... 回传，后端按 channel 分桶 replay（无串台）。
 */
import type { TabToWorkerMessage, WorkerToTabMessage } from './types';
import {
  buildResumeParam,
  isUserLevelChannel,
  parseCompoundId,
} from './compound-id';

/** 单个 tab 的连接状态。 */
interface PortInfo {
  /** 该 tab 订阅的 channel 集合。 */
  channels: Set<string>;
  /** 该 tab 监听的 event 名集合（用于动态注册 EventSource listener）。 */
  events: Set<string>;
  /** 是否已收到 INIT（拿到 token）。 */
  initialized: boolean;
}

// ============ worker 全局状态 ============
const ports = new Map<MessagePort, PortInfo>();
let eventSource: EventSource | null = null;
let authToken = '';
let sessionId = '';
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
/** 所有 tab 订阅的 channel 合集（同步到后端用）。 */
let allChannels = new Set<string>();
/** 所有 tab 监听的 event 名合集（EventSource addEventListener 用）。 */
let allEvents = new Set<string>();
/** channel → 最后收到的 seq（重连 resume 回传用）。 */
const channelSeqMap = new Map<string, number>();

const MAX_RECONNECT_DELAY = 30_000;

/** SharedWorker 全局作用域（self 在 worker 内是 SharedWorkerGlobalScope）。 */
const workerScope = self as unknown as {
  onconnect: ((e: MessageEvent) => void) | null;
};

// ============ SharedWorker 连接入口 ============
workerScope.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  if (!port) return;  // 防御：理论上不会发生，但避免 ports 为空数组时静默拿到 undefined
  ports.set(port, { channels: new Set(), events: new Set(), initialized: false });

  port.onmessage = (ev: MessageEvent) => handleTabMessage(port, ev.data);
  port.addEventListener('close', () => removePort(port));
  port.start();
};

// ============ Tab → Worker 消息处理 ============
function handleTabMessage(port: MessagePort, msg: TabToWorkerMessage) {
  const info = ports.get(port);
  if (!info) return;

  switch (msg.type) {
    case 'INIT': {
      info.initialized = true;
      authToken = msg.token;
      if (!eventSource) {
        connectSse();
      }
      break;
    }
    case 'LISTEN': {
      let changed = false;
      for (const ev of msg.events) {
        if (!info.events.has(ev)) {
          info.events.add(ev);
          changed = true;
        }
      }
      if (changed) {
        recomputeAllEvents();
        registerEventListeners();
      }
      break;
    }
    case 'SUBSCRIBE': {
      let changed = false;
      for (const ch of msg.channels) {
        if (!info.channels.has(ch)) {
          info.channels.add(ch);
          changed = true;
        }
      }
      if (changed) {
        recomputeAllChannels();
        syncSubscriptionsToBackend();
      }
      break;
    }
    case 'UNSUBSCRIBE': {
      let changed = false;
      for (const ch of msg.channels) {
        if (info.channels.has(ch)) {
          info.channels.delete(ch);
          changed = true;
        }
      }
      if (changed) {
        recomputeAllChannels();
        syncSubscriptionsToBackend();
      }
      break;
    }
    case 'CLOSE': {
      removePort(port);
      break;
    }
  }
}

/** 移除一个 port，清理其订阅，重算全集并同步。 */
function removePort(port: MessagePort) {
  const info = ports.get(port);
  if (!info) return;
  ports.delete(port);
  recomputeAllChannels();
  recomputeAllEvents();
  syncSubscriptionsToBackend();
  registerEventListeners();
  if (ports.size === 0) {
    disconnectSse();
  }
}

function recomputeAllChannels() {
  const next = new Set<string>();
  for (const info of ports.values()) {
    for (const ch of info.channels) next.add(ch);
  }
  allChannels = next;
}

function recomputeAllEvents() {
  const next = new Set<string>();
  for (const info of ports.values()) {
    for (const ev of info.events) next.add(ev);
  }
  allEvents = next;
}

// ============ SSE 连接生命周期 ============
async function connectSse() {
  if (eventSource) return;
  try {
    const resp = await fetch('/api/sse/ticket', {
      headers: { 'Flex-Token': authToken },
    });
    const json = await resp.json();
    const ticket = json?.data?.ticket;
    if (!ticket) {
      scheduleReconnect();
      return;
    }
    // 拼接 resume 参数（多 channel 断点续传，channel:seq,...）
    const resume = buildResumeParam(channelSeqMap);
    const resumeParam = resume ? `&resume=${encodeURIComponent(resume)}` : '';
    const es = new EventSource(`/api/sse/connect?ticket=${ticket}${resumeParam}`);
    es.onopen = () => {
      reconnectAttempt = 0;
      broadcastState(true);
    };
    es.onerror = () => {
      broadcastState(false);
      es.close();
      eventSource = null;
      scheduleReconnect();
    };
    // sys.connected 获取 sessionId
    es.addEventListener('sys.connected', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        sessionId = payload?.sessionId ?? '';
        if (sessionId) {
          broadcast({ type: 'SESSION', sessionId });
          syncSubscriptionsToBackend();
        }
      } catch {
        // 忽略解析失败
      }
    });
    eventSource = es;
    // 建连后注册当前所有已知 event 名
    registerEventListeners();
  } catch {
    scheduleReconnect();
  }
}

function disconnectSse() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempt = 0;
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  sessionId = '';
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  if (ports.size === 0) return;
  const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY);
  reconnectAttempt++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSse();
  }, delay);
}

/**
 * 对当前 EventSource 注册 allEvents 中所有 event 名的 listener。
 * 重连后需重新注册（新 EventSource 实例无旧 listener）。
 * 注：addEventListener 对同名事件重复注册会重复触发，但本实现每次连接重建 es，
 * 故不存在重复；sys.connected 始终单独注册。
 */
function registerEventListeners() {
  if (!eventSource) return;
  for (const eventName of allEvents) {
    if (eventName === 'sys.connected') continue; // 已单独处理
    eventSource.addEventListener(eventName, (e: MessageEvent) => {
      dispatchEvent(e, eventName);
    });
  }
}

// ============ 事件分发（核心路由）============
/**
 * 从 MessageEvent 分发：复合 id "channel:seq" 解析出 channel，
 * 更新 channelSeqMap，按 channel 路由给订阅的 tab。
 *
 * - channel 是显式按源（如 task:123）→ 仅路由给订阅了该 channel 的 tab
 * - channel 是隐式用户级（如 user:1001 / broadcast）→ 广播所有 tab
 *   （判断依据：channel 前缀为 user:/role:/broadcast:/session: 视为用户级广播）
 */
function dispatchEvent(e: MessageEvent, eventName: string) {
  const lastId = e.lastEventId;  // 复合 id "channel:seq"
  const parsed2 = parseCompoundId(lastId);
  const channel = parsed2.channel;
  const seq = parsed2.seq;

  // 更新 channelSeqMap（重连续传用）
  if (channel) {
    channelSeqMap.set(channel, seq);
  }

  // 解析 data JSON
  let data: unknown = e.data;
  try {
    data = JSON.parse(e.data);
  } catch {
    // 非 JSON，保持原字符串
  }

  const msg: WorkerToTabMessage = {
    type: 'EVENT',
    channel,
    event: eventName,
    data,
    seq,
  };

  // 路由：显式按源 channel（非用户级前缀）→ 仅订阅者；否则广播全部 tab
  if (channel && !isUserLevelChannel(channel)) {
    for (const [port, info] of ports) {
      if (info.channels.has(channel)) {
        sendToPort(port, msg);
      }
    }
  } else {
    broadcast(msg);
  }
}

// ============ 后端订阅同步 ============
async function syncSubscriptionsToBackend() {
  if (!sessionId || !authToken) return;
  const channels = [...allChannels];
  try {
    await fetch('/api/sse/subscribe', {
      body: JSON.stringify({ sessionId, channels }),
      headers: {
        'Content-Type': 'application/json',
        'Flex-Token': authToken,
      },
      method: 'POST',
    });
  } catch {
    // 同步失败静默
  }
}

// ============ 工具：向 tab 发消息 ============
function sendToPort(port: MessagePort, msg: WorkerToTabMessage) {
  try {
    port.postMessage(msg);
  } catch {
    removePort(port);
  }
}

function broadcast(msg: WorkerToTabMessage) {
  for (const port of ports.keys()) {
    sendToPort(port, msg);
  }
}

function broadcastState(state: boolean) {
  broadcast({ type: 'STATE', connected: state });
}
