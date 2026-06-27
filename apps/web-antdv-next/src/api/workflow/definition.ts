import { requestClient } from '#/api/request';

// 后端 NodeRowMapper 输出；保存时节点内还带 position_x/position_y
export interface BackendNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position_x?: number;
  position_y?: number;
}

export interface BackendEdge {
  id: string;
  source: string;
  target: string;
  data?: { condition?: string };
}

/** flow_definition 实体（列表项）。 */
export interface FlowDefinition {
  id: string;
  name: string;
  description: null | string;
  viewport: null | string;
  enabled: number; // 0/1
  version: number;
  createdBy: null | number;
  updatedBy: null | number;
  createdAt: null | string;
  updatedAt: null | string;
}

/** GET /definition/{id} 平铺整图 JSON。viewport 纯相机状态。 */
export interface DefinitionGraph {
  id: string;
  name: string;
  description: null | string;
  enabled: number;
  version: number;
  viewport: null | { x: number; y: number; zoom: number };
  nodes: BackendNode[];
  edges: BackendEdge[];
}

/** POST/PUT body（平铺匹配 WorkflowDefinitionDto）。 */
export interface DefinitionDto {
  name: string;
  description: null | string;
  viewport: { x: number; y: number; zoom: number };
  nodes: BackendNode[];
  edges: BackendEdge[];
}

export function getDefinitionListApi() {
  return requestClient.get<FlowDefinition[]>('/wf/definition/list');
}

export function getDefinitionDetailApi(id: string) {
  return requestClient.get<DefinitionGraph>(`/wf/definition/${id}`);
}

export function createDefinitionApi(body: DefinitionDto) {
  return requestClient.post<string>('/wf/definition', body);
}

export function updateDefinitionApi(id: string, body: DefinitionDto) {
  return requestClient.put<void>(`/wf/definition/${id}`, body);
}

export function deleteDefinitionApi(id: string) {
  return requestClient.delete<void>(`/wf/definition/${id}`);
}

export function enableDefinitionApi(id: string) {
  return requestClient.put<void>(`/wf/definition/${id}/enable`);
}

export function disableDefinitionApi(id: string) {
  return requestClient.put<void>(`/wf/definition/${id}/disable`);
}

export function scheduleDefinitionApi(id: string, cron: string, params?: Record<string, any>) {
  return requestClient.put<void>(`/wf/definition/${id}/schedule`, {
    cron,
    params: params ?? {},
  });
}

export function cancelScheduleApi(id: string) {
  return requestClient.delete<void>(`/wf/definition/${id}/schedule`);
}
