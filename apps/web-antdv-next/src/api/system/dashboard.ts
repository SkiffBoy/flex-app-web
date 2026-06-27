import { requestClient } from '#/api/request';

export interface DashboardOverviewVo {
  cards: Record<string, any>;
  implemented: boolean;
  message: string;
  period: string;
}

export interface OpsDashboardVo {
  cards: Record<string, any>;
  node: string;
  nodes: string[];
  timestamp: string;
}

export function getDashboardOverviewApi(period?: string) {
  return requestClient.get<DashboardOverviewVo>(
    '/admin/dashboard/overview',
    { params: { period } },
  );
}

export function getOpsDashboardApi(node?: string) {
  return requestClient.get<OpsDashboardVo>('/admin/dashboard/ops', {
    params: { node },
  });
}

export function getOpsDetailApi(node: string | undefined, type: string) {
  return requestClient.get<Record<string, any>>(
    '/admin/dashboard/ops/detail',
    { params: { node, type } },
  );
}
