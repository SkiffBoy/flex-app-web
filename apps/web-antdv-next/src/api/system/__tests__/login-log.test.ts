import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLoginLogListApi, getLoginLogStatsApi } from '../login-log';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet };
  },
}));

describe('system/login-log API 端点契约', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('getLoginLogListApi 无参调 /admin/login-logs', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getLoginLogListApi({});
    expect(mockGet).toHaveBeenCalledWith('/admin/login-logs', { params: {} });
  });

  it('getLoginLogListApi 带 userId/event/page/size', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getLoginLogListApi({ event: 'LOGIN', page: 1, size: 20, userId: 3 });
    expect(mockGet).toHaveBeenCalledWith('/admin/login-logs', {
      params: { event: 'LOGIN', page: 1, size: 20, userId: 3 },
    });
  });

  it('getLoginLogStatsApi GET /admin/login-logs/stats', async () => {
    mockGet.mockResolvedValue([]);
    await getLoginLogStatsApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/login-logs/stats');
  });
});
