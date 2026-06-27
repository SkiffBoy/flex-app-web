import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getApiLogBodyApi,
  getApiLogCategoriesApi,
  getApiLogChainApi,
  queryApiLogApi,
} from '../api-log';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet, post: mockPost };
  },
}));

describe('system/api-log API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost].forEach((m) => m.mockReset());
  });

  it('queryApiLogApi POST /admin/api-log/query（body 透传）', async () => {
    mockPost.mockResolvedValue({ pageNo: 1, pageSize: 20, rows: [], total: 0 });
    const body = {
      pageNo: 1,
      pageSize: 20,
      timeFrom: '2026-06-01T00:00:00',
      timeTo: '2026-06-25T00:00:00',
    };
    await queryApiLogApi(body);
    expect(mockPost).toHaveBeenCalledWith('/admin/api-log/query', body);
  });

  it('getApiLogChainApi GET /admin/api-log/{traceId}/chain', async () => {
    mockGet.mockResolvedValue([]);
    await getApiLogChainApi('trace-abc');
    expect(mockGet).toHaveBeenCalledWith('/admin/api-log/trace-abc/chain');
  });

  it('getApiLogBodyApi GET /admin/api-log/{traceId}/{spanId}/body', async () => {
    mockGet.mockResolvedValue({});
    await getApiLogBodyApi('trace-abc', 'span-1');
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/api-log/trace-abc/span-1/body',
    );
  });

  it('getApiLogCategoriesApi GET /admin/api-log/categories', async () => {
    mockGet.mockResolvedValue([]);
    await getApiLogCategoriesApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/api-log/categories');
  });
});
