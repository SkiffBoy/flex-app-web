import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelSyncApi,
  getExecutionApi,
  getSyncPipelineListApi,
  triggerSyncApi,
} from '../data-sync';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet, post: mockPost };
  },
}));

describe('system/data-sync API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost].forEach((m) => m.mockReset());
  });

  it('triggerSyncApi POST /api/sync/trigger/{path}', async () => {
    mockPost.mockResolvedValue({ status: 'RUNNING' });
    await triggerSyncApi('my-path');
    expect(mockPost).toHaveBeenCalledWith('/api/sync/trigger/my-path');
  });

  it('cancelSyncApi POST /api/sync/cancel/{logId}', async () => {
    mockPost.mockResolvedValue({ result: 'CANCELLED' });
    await cancelSyncApi(123);
    expect(mockPost).toHaveBeenCalledWith('/api/sync/cancel/123');
  });

  it('getExecutionApi GET /api/sync/execution/{logId}', async () => {
    mockGet.mockResolvedValue({ status: 2 });
    await getExecutionApi(123);
    expect(mockGet).toHaveBeenCalledWith('/api/sync/execution/123');
  });

  it('getSyncPipelineListApi GET /api/sync/pipeline', async () => {
    mockGet.mockResolvedValue([]);
    await getSyncPipelineListApi();
    expect(mockGet).toHaveBeenCalledWith('/api/sync/pipeline');
  });
});
