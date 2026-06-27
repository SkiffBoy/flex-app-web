import { requestClient } from '#/api/request';

/** 后端 TaskInfo（record）。 */
export interface TaskInfo {
  category: string;
  description: string;
  enabled: boolean;
  label: string;
  lastFailure: null | string;
  lastSuccess: null | string;
  nextExecutionTime: null | string;
  schedule: string;
  taskName: string;
  type: string; // SIMPLE / WORKFLOW / SYSTEM
}

export interface TaskHistoryPage {
  rows: Record<string, any>[];
  total: number;
}

/** 任务列表（非分页，全量）。 */
export function getTaskListApi(params?: { category?: string; type?: string }) {
  return requestClient.get<TaskInfo[]>('/admin/tasks', { params });
}

export function getTaskApi(taskName: string) {
  return requestClient.get<TaskInfo>(`/admin/tasks/${taskName}`);
}

export function enableTaskApi(taskName: string) {
  return requestClient.put(`/admin/tasks/${taskName}/enable`);
}

export function disableTaskApi(taskName: string) {
  return requestClient.put(`/admin/tasks/${taskName}/disable`);
}

export function triggerTaskApi(taskName: string, body?: Record<string, any>) {
  return requestClient.post(`/admin/tasks/${taskName}/trigger`, body);
}

export function rescheduleTaskApi(
  taskName: string,
  body: Record<string, any>,
) {
  return requestClient.put(`/admin/tasks/${taskName}/schedule`, body);
}

export function getTaskHistoryApi(
  taskName: string,
  params: { page?: number; size?: number },
) {
  return requestClient.get<TaskHistoryPage>(
    `/admin/tasks/${taskName}/history`,
    { params },
  );
}
