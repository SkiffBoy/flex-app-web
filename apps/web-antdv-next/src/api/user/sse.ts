import { requestClient } from '#/api/request';

/** POST /sse/ticket → 一次性票据（TTL 30s）。 */
export function getSseTicketApi() {
  return requestClient.post<{ ticket: string; ttl: number }>('/sse/ticket');
}
