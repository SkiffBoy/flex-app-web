import { requestClient } from '#/api/request';

export interface ApiLogQuery {
  category?: string;
  durationFromMs?: number;
  durationToMs?: number;
  method?: string;
  pageNo?: number;
  pageSize?: number;
  path?: string;
  statusFrom?: number;
  statusTo?: number;
  timeFrom: string; // 必填（后端约束）
  timeTo: string; // 必填（后端约束，≤30天）
  traceId?: string;
}

export interface ApiLogQueryResult {
  category: string;
  clientIp: string;
  createdAt: string;
  durationMs: number;
  id: number;
  incomplete: boolean;
  method: string;
  parentSpanId: string;
  path: string;
  pluginId: string;
  query: string;
  requestSize: number;
  responseSize: number;
  spanId: string;
  status: number;
  storageStatus: string;
  traceId: string;
  truncated: boolean;
  type: string;
  userId: string;
}

export interface ApiLogQueryPage {
  pageNo: number;
  pageSize: number;
  rows: ApiLogQueryResult[];
  total: number;
}

export interface ApiLogCategory {
  label: string;
  value: string;
}

export interface ApiLogChainNode {
  category: string;
  createdAt: string;
  durationMs: number;
  method: string;
  parentSpanId: string;
  path: string;
  spanId: string;
  status: number;
  type: string;
}

export interface ApiLogBodyVo {
  requestBody: null | string;
  requestSize: number;
  responseBody: null | string;
  responseSize: number;
  spanId: string;
  traceId: string;
  truncated: boolean;
}

/** ⚠️ 必须带 timeFrom+timeTo（≤30天），否则后端抛 QueryTooBroad。 */
export function queryApiLogApi(body: ApiLogQuery) {
  return requestClient.post<ApiLogQueryPage>('/admin/api-log/query', body);
}

export function getApiLogChainApi(traceId: string) {
  return requestClient.get<ApiLogChainNode[]>(
    `/admin/api-log/${traceId}/chain`,
  );
}

export function getApiLogBodyApi(traceId: string, spanId: string) {
  return requestClient.get<ApiLogBodyVo>(
    `/admin/api-log/${traceId}/${spanId}/body`,
  );
}

export function getApiLogCategoriesApi() {
  return requestClient.get<ApiLogCategory[]>('/admin/api-log/categories');
}
