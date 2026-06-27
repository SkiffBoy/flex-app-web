import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getDashboardOverviewApi,
  getOpsDashboardApi,
  getOpsDetailApi,
} from '../dashboard';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet };
  },
}));

describe('system/dashboard API 端点契约', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('getDashboardOverviewApi 透传 period', async () => {
    mockGet.mockResolvedValue({
      cards: {},
      implemented: false,
      message: '',
      period: '7D',
    });
    await getDashboardOverviewApi('7D');
    expect(mockGet).toHaveBeenCalledWith('/admin/dashboard/overview', {
      params: { period: '7D' },
    });
  });

  it('getOpsDashboardApi 透传 node', async () => {
    mockGet.mockResolvedValue({
      cards: {},
      node: '',
      nodes: [],
      timestamp: '',
    });
    await getOpsDashboardApi('node-1');
    expect(mockGet).toHaveBeenCalledWith('/admin/dashboard/ops', {
      params: { node: 'node-1' },
    });
  });

  it('getOpsDetailApi GET ops/detail', async () => {
    mockGet.mockResolvedValue({});
    await getOpsDetailApi('node-1', 'cpu-trend');
    expect(mockGet).toHaveBeenCalledWith('/admin/dashboard/ops/detail', {
      params: { node: 'node-1', type: 'cpu-trend' },
    });
  });
});
