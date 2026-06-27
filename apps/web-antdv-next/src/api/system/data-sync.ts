import { requestClient } from '#/api/request';

/** 触发结果。 */
export interface SyncTriggerResult {
  batchId?: string;
  logId?: number;
  message?: string;
  pipelineId?: number;
  /** RUNNING_BY_OTHER = 同 pipeline 正在执行；RUNNING = 已触发 */
  status: string;
}

/** 取消结果。 */
export interface SyncCancelResult {
  node: string;
  /** CANCELLED | NOT_RUNNING */
  result: string;
}

/** 同步链路（管理页列表用）。 */
export interface SyncPipeline {
  apiTriggerPath: null | string;
  enabled: number;
  id: number;
  /** 2=API写Kafka 3=API导出文件 */
  mode: number;
  pipelineCode: string;
  pipelineName: string;
}

/** 触发同步执行（模式 2/3）。POST /api/sync/trigger/{apiTriggerPath}。 */
export function triggerSyncApi(path: string) {
  return requestClient.post<SyncTriggerResult>(`/api/sync/trigger/${path}`);
}

/** 取消执行（本节点本地或 Hazelcast 定向转发到归属节点）。 */
export function cancelSyncApi(logId: number) {
  return requestClient.post<SyncCancelResult>(`/api/sync/cancel/${logId}`);
}

/** 查执行进度（轮询用）。 */
export function getExecutionApi(logId: number) {
  return requestClient.get<Record<string, any>>(
    `/api/sync/execution/${logId}`,
  );
}

/** 同步链路列表（管理页用）。 */
export function getSyncPipelineListApi() {
  return requestClient.get<SyncPipeline[]>('/api/sync/pipeline');
}
