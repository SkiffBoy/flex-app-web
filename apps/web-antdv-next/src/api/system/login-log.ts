import { requestClient } from '#/api/request';

/** 后端 LoginLogStat（按 event 聚合计数）。 */
export interface LoginLogStat {
  count: number;
  event: string;
}

/** 后端 SysLoginLog。 */
export interface LoginLog {
  browser: null | string;
  clientIp: null | string;
  createdAt: string;
  deviceType: null | string;
  errorMessage: null | string;
  event: string;
  id: number;
  loginLocation: null | string;
  os: null | string;
  reason: null | string;
  success: number;
  userId: number;
  username: string;
}

export interface LoginLogPageResult {
  rows: LoginLog[];
  total: number;
}

/** 登录日志列表（userId/event 过滤）。 */
export function getLoginLogListApi(params: {
  event?: string;
  page?: number;
  size?: number;
  userId?: number;
}) {
  return requestClient.get<LoginLogPageResult>('/admin/login-logs', { params });
}

/** 登录统计（按 event 计数，后端无 trend 端点）。 */
export function getLoginLogStatsApi() {
  return requestClient.get<LoginLogStat[]>('/admin/login-logs/stats');
}
