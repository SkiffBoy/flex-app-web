import type { DefinitionGraph } from '#/api/workflow/definition';

import { describe, expect, it } from 'vitest';

import {
  autoLayout,
  describeCron,
  transformFromBackend,
  transformToBackend,
} from '../transform';

describe('transformFromBackend', () => {
  it('后端节点 position_x/y → tinyflow position，viewport 直传', () => {
    const graph: DefinitionGraph = {
      id: 'd1',
      name: 'f',
      description: null,
      enabled: 1,
      version: 1,
      viewport: { x: 10, y: 20, zoom: 0.8 },
      nodes: [
        { id: 'n1', type: 'startNode', data: { name: '开始' }, position_x: 100, position_y: 50 },
        { id: 'n2', type: 'endNode', data: { name: '结束' }, position_x: 300, position_y: 50 },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', data: {} }],
    };

    const result = transformFromBackend(graph);

    expect(result.nodes[0]!.position).toEqual({ x: 100, y: 50 });
    expect(result.nodes[1]!.position).toEqual({ x: 300, y: 50 });
    expect(result.nodes[0]!.data.name).toBe('开始');
    expect(result.viewport).toEqual({ x: 10, y: 20, zoom: 0.8 });
    expect(result.edges[0]!.source).toBe('n1');
  });

  it('节点无 position_x/y 时走 autoLayout 兜底（坐标非 NaN）', () => {
    const graph: DefinitionGraph = {
      id: 'd1', name: 'f', description: null, enabled: 1, version: 1,
      viewport: null,
      nodes: [
        { id: 'a', type: 'startNode', data: {} },
        { id: 'b', type: 'endNode', data: {} },
      ],
      edges: [{ id: 'e', source: 'a', target: 'b', data: {} }],
    };

    const result = transformFromBackend(graph);

    for (const n of result.nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
  });

  it('viewport 为 null 时给默认 {0,0,1}', () => {
    const graph: DefinitionGraph = {
      id: 'd', name: 'f', description: null, enabled: 1, version: 1,
      viewport: null, nodes: [], edges: [],
    };
    expect(transformFromBackend(graph).viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('transformToBackend', () => {
  it('tinyflow position → 节点 position_x/y（单写），viewport 纯相机状态', () => {
    const data = {
      nodes: [
        { id: 'n1', type: 'startNode', position: { x: 120, y: 80 }, data: { name: '开始' } },
      ],
      edges: [],
      viewport: { x: 5, y: 6, zoom: 1 },
    };

    const body = transformToBackend(data, 'myflow', 'desc');

    expect(body.name).toBe('myflow');
    expect(body.description).toBe('desc');
    expect(body.viewport).toEqual({ x: 5, y: 6, zoom: 1 });
    expect(body.nodes[0]!.position_x).toBe(120);
    expect(body.nodes[0]!.position_y).toBe(80);
    expect(body.nodes[0]!.data.name).toBe('开始');
    // viewport 不含 nodePositions（纯相机状态）
    expect((body.viewport as any).nodePositions).toBeUndefined();
  });

  it('description undefined → null', () => {
    const data = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
    expect(transformToBackend(data, 'f').description).toBeNull();
  });
});

describe('autoLayout', () => {
  it('按拓扑分层填坐标，下层节点的 y 更大', () => {
    const nodes: any[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: any[] = [{ source: 'a', target: 'b' }];
    autoLayout(nodes, edges);
    // b 在 a 的下层（y 更大）
    expect(nodes[1]!.position.y).toBeGreaterThan(nodes[0]!.position.y);
  });
});

describe('describeCron', () => {
  it('每天 02:00', () => {
    expect(describeCron('0 0 2 * * ?')).toContain('02:00');
  });
  it('无法识别回退原文', () => {
    expect(describeCron('garbage')).toBe('garbage');
  });
});
