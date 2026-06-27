import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPermissionApi,
  deletePermissionApi,
  getPermissionGroupListApi,
  getPermissionListApi,
  updatePermissionApi,
} from '../permission';

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

describe('system/permission API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost, mockPut, mockDelete].forEach((m) => m.mockReset());
  });

  it('getPermissionListApi GET /admin/permission/list', async () => {
    mockGet.mockResolvedValue([]);
    await getPermissionListApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/permission/list');
  });

  it('getPermissionGroupListApi GET /admin/permission-group/list', async () => {
    mockGet.mockResolvedValue([]);
    await getPermissionGroupListApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/permission-group/list');
  });

  it('createPermissionApi POST /admin/permission', async () => {
    mockPost.mockResolvedValue({});
    const body = {
      groupCode: 'sys.user',
      permissionCode: 'sys.user.x',
      permissionName: 'x',
    };
    await createPermissionApi(body);
    expect(mockPost).toHaveBeenCalledWith('/admin/permission', body);
  });

  it('updatePermissionApi PUT /admin/permission/{id}', async () => {
    mockPut.mockResolvedValue({});
    await updatePermissionApi(8, { permissionName: 'y' });
    expect(mockPut).toHaveBeenCalledWith('/admin/permission/8', {
      permissionName: 'y',
    });
  });

  it('deletePermissionApi DELETE /admin/permission/{id}', async () => {
    mockDelete.mockResolvedValue({});
    await deletePermissionApi(9);
    expect(mockDelete).toHaveBeenCalledWith('/admin/permission/9');
  });
});
