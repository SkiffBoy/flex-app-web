import type {
  BackendEdge,
  BackendNode,
  DefinitionDto,
  DefinitionGraph,
} from '#/api/workflow/definition';

// tinyflow-ui 节点形态（xyflow 风格）
export interface TinyflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}
export interface TinyflowEdge {
  id: string;
  source: string;
  target: string;
  data?: { condition?: string };
}
export interface TinyflowData {
  nodes: TinyflowNode[];
  edges: TinyflowEdge[];
  viewport: { x: number; y: number; zoom: number };
}

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
const LAYER_GAP_Y = 120;
const NODE_GAP_X = 200;
const START_X = 80;
const START_Y = 80;

/** 后端 detail → tinyflow-ui data（加载路径）。position 从节点 position_x/y 恢复，无则 autoLayout 兜底。 */
export function transformFromBackend(graph: DefinitionGraph): TinyflowData {
  const nodes: TinyflowNode[] = graph.nodes.map((n) => ({
    data: { ...n.data },
    id: n.id,
    position: {
      x: n.position_x ?? 0,
      y: n.position_y ?? 0,
    },
    type: n.type,
  }));
  const edges: TinyflowEdge[] = graph.edges.map((e) => ({
    data: e.data,
    id: e.id,
    source: e.source,
    target: e.target,
  }));

  // 无任何坐标信息时走兜底布局
  const hasAnyPosition = graph.nodes.some(
    (n) => n.position_x != null || n.position_y != null,
  );
  if (!hasAnyPosition && nodes.length > 0) {
    autoLayout(nodes, edges);
  }

  return {
    edges,
    nodes,
    viewport: graph.viewport ?? { ...DEFAULT_VIEWPORT },
  };
}

/** tinyflow-ui getData() → 后端 create/update body（保存路径）。position 单写 position_x/y。 */
export function transformToBackend(
  data: TinyflowData,
  name: string,
  description?: string,
): DefinitionDto {
  const nodes: BackendNode[] = data.nodes.map((n) => ({
    data: { ...n.data },
    id: n.id,
    position_x: n.position.x,
    position_y: n.position.y,
    type: n.type,
  }));
  const edges: BackendEdge[] = data.edges.map((e) => ({
    data: e.data,
    id: e.id,
    source: e.source,
    target: e.target,
  }));
  return {
    description: description ?? null,
    edges,
    name,
    nodes,
    viewport: { ...data.viewport },
  };
}

/**
 * 无坐标兜底：按 edges 拓扑分层（BFS Kahn），同层水平排列，层间纵向递增。原地填 position。
 * 孤立节点放第 0 层。
 */
export function autoLayout(nodes: TinyflowNode[], edges: TinyflowEdge[]): void {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
  }
  // BFS 分层（Kahn）
  const layers = new Map<string, number>();
  let queue = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  let layer = 0;
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      layers.set(id, layer);
      for (const child of adj.get(id) ?? []) {
        inDegree.set(child, (inDegree.get(child) ?? 0) - 1);
        if ((inDegree.get(child) ?? 0) === 0) next.push(child);
      }
    }
    queue = next;
    layer++;
  }
  // 未分层的（环或孤立）放第 0 层
  const countPerLayer = new Map<number, number>();
  for (const n of nodes) {
    const l = layers.get(n.id) ?? 0;
    const idx = countPerLayer.get(l) ?? 0;
    countPerLayer.set(l, idx + 1);
    n.position = { x: START_X + idx * NODE_GAP_X, y: START_Y + l * LAYER_GAP_Y };
  }
}

/**
 * cron 人类可读预览（6 字段 Quartz：秒 分 时 日 月 周）。仅处理常见模式，无法识别回退原文。
 */
export function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 6) return cron;
  const sec = parts[0] ?? '';
  const min = parts[1] ?? '';
  const hour = parts[2] ?? '';
  const day = parts[3] ?? '';
  const month = parts[4] ?? '';
  // 每天 HH:MM:SS（day=* month=*）
  if (day === '*' && month === '*') {
    if (isNumber(hour) && isNumber(min)) {
      const s = isNumber(sec) ? `:${pad(sec)}` : '';
      return `每天 ${pad(hour)}:${pad(min)}${s}`;
    }
  }
  return cron;
}

function isNumber(v: string): boolean {
  return /^\d+$/.test(v);
}
function pad(v: string): string {
  return v.padStart(2, '0');
}
