import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  disableTaskApi,
  enableTaskApi,
  getTaskApi,
  getTaskHistoryApi,
  getTaskListApi,
  rescheduleTaskApi,
  triggerTaskApi,
} from '../task';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet, post: mockPost, put: mockPut };
  },
}));

describe('system/task API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost, mockPut].forEach((m) => m.mockReset());
  });

  it('getTaskListApi 无参 GET /admin/tasks', async () => {
    mockGet.mockResolvedValue([]);
    await getTaskListApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/tasks', {
      params: undefined,
    });
  });

  it('getTaskListApi 带 type/category', async () => {
    mockGet.mockResolvedValue([]);
    await getTaskListApi({ category: 'SYNC', type: 'SIMPLE' });
    expect(mockGet).toHaveBeenCalledWith('/admin/tasks', {
      params: { category: 'SYNC', type: 'SIMPLE' },
    });
  });

  it('getTaskApi GET /admin/tasks/{taskName}', async () => {
    mockGet.mockResolvedValue({});
    await getTaskApi('dailyReport');
    expect(mockGet).toHaveBeenCalledWith('/admin/tasks/dailyReport');
  });

  it('enableTaskApi PUT /admin/tasks/{taskName}/enable', async () => {
    mockPut.mockResolvedValue(undefined);
    await enableTaskApi('dailyReport');
    expect(mockPut).toHaveBeenCalledWith('/admin/tasks/dailyReport/enable');
  });

  it('disableTaskApi PUT /admin/tasks/{taskName}/disable', async () => {
    mockPut.mockResolvedValue(undefined);
    await disableTaskApi('dailyReport');
    expect(mockPut).toHaveBeenCalledWith('/admin/tasks/dailyReport/disable');
  });

  it('triggerTaskApi POST /admin/tasks/{taskName}/trigger', async () => {
    mockPost.mockResolvedValue(undefined);
    await triggerTaskApi('dailyReport', { force: true });
    expect(mockPost).toHaveBeenCalledWith(
      '/admin/tasks/dailyReport/trigger',
      { force: true },
    );
  });

  it('rescheduleTaskApi PUT /admin/tasks/{taskName}/schedule', async () => {
    mockPut.mockResolvedValue(undefined);
    await rescheduleTaskApi('dailyReport', { schedule: '0 0 * * *' });
    expect(mockPut).toHaveBeenCalledWith(
      '/admin/tasks/dailyReport/schedule',
      { schedule: '0 0 * * *' },
    );
  });

  it('getTaskHistoryApi GET /admin/tasks/{taskName}/history', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getTaskHistoryApi('dailyReport', { page: 1, size: 20 });
    expect(mockGet).toHaveBeenCalledWith('/admin/tasks/dailyReport/history', {
      params: { page: 1, size: 20 },
    });
  });
});
