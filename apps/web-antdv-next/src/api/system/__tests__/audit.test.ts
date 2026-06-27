import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAuditLogApi,
  getAuditLogListApi,
  getAuditLogStatsApi,
} from '../audit';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet };
  },
}));

describe('system/audit API 端点契约', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('getAuditLogListApi 透传过滤参数', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getAuditLogListApi({ module: 'USER', page: 1, size: 20 });
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs', {
      params: { module: 'USER', page: 1, size: 20 },
    });
  });

  it('getAuditLogApi GET /admin/audit-logs/{id}', async () => {
    mockGet.mockResolvedValue({});
    await getAuditLogApi(42);
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs/42');
  });

  it('getAuditLogStatsApi 透传时间范围', async () => {
    mockGet.mockResolvedValue([]);
    await getAuditLogStatsApi({
      endTime: '2026-06-25T00:00:00',
      startTime: '2026-06-01T00:00:00',
    });
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs/stats', {
      params: {
        endTime: '2026-06-25T00:00:00',
        startTime: '2026-06-01T00:00:00',
      },
    });
  });
});
