/**
 * SSE 复合 id 工具函数（纯函数，可独立单测）。
 *
 * <p>复合 id 格式：{@code channel:seq}，其中 channel 内部可能含 ":"（如 user:1001 / task:123）。
 * 故从右切最后一个 ":" 分隔 channel 与 seq。
 */

/** channel 是否为用户级广播域（广播给所有 tab，不按订阅过滤）。 */
export function isUserLevelChannel(channel: string): boolean {
  return (
    channel.startsWith('user:')
    || channel.startsWith('role:')
    || channel === 'broadcast'
    || channel.startsWith('session:')
  );
}

/**
 * 解析复合 id "channel:seq"。
 * @returns channel=null 表示解析失败；seq=0 是降级值
 */
export function parseCompoundId(
  id: string,
): { channel: null | string; seq: number } {
  if (!id) return { channel: null, seq: 0 };
  const lastColon = id.lastIndexOf(':');
  if (lastColon <= 0) return { channel: null, seq: 0 };
  const channel = id.slice(0, Math.max(0, lastColon));
  const seq = Number.parseInt(id.slice(lastColon + 1), 10);
  if (Number.isNaN(seq)) return { channel: null, seq: 0 };
  return { channel, seq };
}

/** 把 channelSeqMap 转为 resume 查询参数 "ch1:seq1,ch2:seq2"。 */
export function buildResumeParam(channelSeqMap: Map<string, number>): string {
  const parts: string[] = [];
  for (const [channel, seq] of channelSeqMap) {
    parts.push(`${channel}:${seq}`);
  }
  return parts.join(',');
}
