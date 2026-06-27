import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMenuApi,
  deleteMenuApi,
  getMenuListApi,
  updateMenuApi,
} from '../menu';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

// vi.mock 被 vitest 提升到 import 之前执行
vi.mock('#/api/request', () => ({
  get requestClient() {
    return {
      delete: mockDelete,
      get: mockGet,
      post: mockPost,
      put: mockPut,
    };
  },
}));

describe('system/menu API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost, mockPut, mockDelete].forEach((m) => m.mockReset());
  });

  it('getMenuListApi GET /admin/menu/list', async () => {
    mockGet.mockResolvedValue([]);
    await getMenuListApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/menu/list');
  });

  it('createMenuApi POST /admin/menu', async () => {
    mockPost.mockResolvedValue({});
    const body = { menuName: 'x', routeName: 'X', path: '/x' };
    await createMenuApi(body);
    expect(mockPost).toHaveBeenCalledWith('/admin/menu', body);
  });

  it('updateMenuApi PUT /admin/menu/{id}', async () => {
    mockPut.mockResolvedValue({});
    await updateMenuApi(3, { menuName: 'y' });
    expect(mockPut).toHaveBeenCalledWith('/admin/menu/3', { menuName: 'y' });
  });

  it('deleteMenuApi DELETE /admin/menu/{id}', async () => {
    mockDelete.mockResolvedValue({});
    await deleteMenuApi(4);
    expect(mockDelete).toHaveBeenCalledWith('/admin/menu/4');
  });
});
