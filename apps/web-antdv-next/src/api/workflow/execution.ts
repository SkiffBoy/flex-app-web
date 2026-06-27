import { requestClient } from '#/api/request';

// 后端 dict 枚举（字面量联合）
export type ChainStatus =
  | 'CANCELLED'
  | 'ERROR'
  | 'FAILED'
  | 'READY'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'SUSPEND';
export type NodeStatus =
  | 'ERROR'
  | 'FAILED'
  | 'READY'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'SUSPEND';
export type FlowTriggerType =
  | 'API'
  | 'EVENT'
  | 'MANUAL'
  | 'SCHEDULE'
  | 'SIMPLE_TASK';

/** flow_instance 实体（实例详情/列表）。 */
export interface FlowInstance {
  instanceId: string;
  definitionId: string;
  parentInstanceId: null | string;
  status: ChainStatus;
  message: null | string;
  error: null | string;
  computeCost: null | number;
  stateData: null | string;
  triggerType: FlowTriggerType;
  createdBy: null | number;
  /** 启动该实例的集群节点 memberId（粘性归属，崩溃恢复 liveness 判定用）。 */
  ownerNode: null | string;
  startedAt: null | string;
  finishedAt: null | string;
  createdAt: null | string;
}

/** flow_node_state 实体（节点状态列表）。 */
export interface FlowNodeState {
  id: number;
  chainInstanceId: string;
  nodeId: string;
  status: NodeStatus;
  retryCount: number;
  loopCount: number;
  triggerCount: number;
  executeCount: number;
  error: null | string;
  stateData: null | string;
  createdAt: null | string;
  updatedAt: null | string;
}

export function startExecutionApi(
  definitionId: string,
  params?: Record<string, any>,
) {
  return requestClient.post<string>(`/wf/execution/${definitionId}/start`, {
    params: params ?? {},
  });
}

export function listExecutionApi(query: {
  definitionId?: string;
  status?: ChainStatus;
}) {
  return requestClient.get<FlowInstance[]>('/wf/execution/list', { params: query });
}

export function getExecutionDetailApi(instanceId: string) {
  return requestClient.get<FlowInstance>(`/wf/execution/${instanceId}`);
}

export function getExecutionNodesApi(instanceId: string) {
  return requestClient.get<FlowNodeState[]>(`/wf/execution/${instanceId}/nodes`);
}

export function resumeExecutionApi(
  instanceId: string,
  params?: Record<string, any>,
) {
  return requestClient.post<Record<string, any>>(`/wf/execution/${instanceId}/resume`, {
    params: params ?? {},
  });
}

/** 取消工作流实例（移除后续 trigger + 标 CANCELLED 终态 + SSE 通知）。 */
export function cancelExecutionApi(instanceId: string) {
  return requestClient.post<void>(`/wf/execution/${instanceId}/cancel`);
}
