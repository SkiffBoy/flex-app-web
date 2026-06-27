import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAllDictApi, getDictDataApi, getDictTypesApi } from '../dict';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet };
  },
}));

describe('system/dict API 端点契约', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('getDictTypesApi GET /system/dict/types', async () => {
    mockGet.mockResolvedValue([]);
    await getDictTypesApi();
    expect(mockGet).toHaveBeenCalledWith('/system/dict/types');
  });

  it('getDictDataApi GET /system/dict/data/{typeCode}', async () => {
    mockGet.mockResolvedValue([]);
    await getDictDataApi('user_status');
    expect(mockGet).toHaveBeenCalledWith('/system/dict/data/user_status');
  });

  it('getAllDictApi GET /system/dict/all', async () => {
    mockGet.mockResolvedValue({ items: {}, types: [] });
    await getAllDictApi();
    expect(mockGet).toHaveBeenCalledWith('/system/dict/all');
  });
});
