import { requestClient } from '#/api/request';

/** 后端 SysAuditLog。 */
export interface SysAuditLog {
  action: string;
  clientIp: string;
  createdAt: string;
  detail: string;
  module: string;
  operatorId: number;
  operatorType: string;
  targetId: string;
  targetName: string;
  targetType: string;
  traceId: string;
  userAgent: string;
}

export interface AuditLogStat {
  action: string;
  count: number;
  module: string;
}

export interface AuditLogPageResult {
  rows: SysAuditLog[];
  total: number;
}

export interface AuditLogQuery {
  action?: string;
  endTime?: string;
  module?: string;
  operatorId?: number;
  page?: number;
  size?: number;
  startTime?: string;
  traceId?: string;
}

/** 审计日志列表（⚠️ 后端无任何过滤条件抛 QueryTooBroad）。 */
export function getAuditLogListApi(params: AuditLogQuery) {
  return requestClient.get<AuditLogPageResult>('/admin/audit-logs', { params });
}

export function getAuditLogApi(id: number) {
  return requestClient.get<SysAuditLog>(`/admin/audit-logs/${id}`);
}

export function getAuditLogStatsApi(params: {
  endTime?: string;
  startTime?: string;
}) {
  return requestClient.get<AuditLogStat[]>('/admin/audit-logs/stats', {
    params,
  });
}
