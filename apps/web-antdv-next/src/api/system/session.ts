import { requestClient } from '#/api/request';

/** 后端 SessionVo（record，脱敏，不含 tokenValue/userAgent）。 */
export interface SessionVo {
  browser: string;
  clientIp: string;
  deviceType: string;
  id: number;
  lastActiveAt: string;
  loginAt: string;
  os: string;
  sessionId: string;
  status: string;
  userId: number;
}

export interface SessionPageResult {
  rows: SessionVo[];
  total: number;
}

/** 在线会话列表（userId/deviceType 过滤）。 */
export function getAdminSessionListApi(params: {
  deviceType?: string;
  page?: number;
  size?: number;
  userId?: number;
}) {
  return requestClient.get<SessionPageResult>('/admin/sessions', { params });
}

export function getAdminSessionApi(sessionId: string) {
  return requestClient.get<SessionVo>(`/admin/sessions/${sessionId}`);
}

/** 踢出单个会话。 */
export function kickoutSessionApi(sessionId: string) {
  return requestClient.delete(`/admin/sessions/${sessionId}`);
}

/** 踢出用户全部会话。 */
export function kickoutUserSessionsApi(userId: number) {
  return requestClient.delete(`/admin/sessions/user/${userId}`);
}
