import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assignUserGrantsApi,
  createUserApi,
  deleteUserApi,
  getUserGrantsApi,
  getUserListApi,
  resetUserPasswordApi,
  setUserEnabledApi,
  setUserStatusApi,
  unlockUserApi,
  updateUserApi,
} from '../user';

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

describe('system/user API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost, mockPut, mockDelete].forEach((m) => m.mockReset());
  });

  it('getUserListApi 无参调 /admin/user/list（默认 page/size）', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getUserListApi({});
    expect(mockGet).toHaveBeenCalledWith('/admin/user/list', {
      params: {},
    });
  });

  it('getUserListApi 带 keyword/page/size 透传 params', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getUserListApi({ keyword: 'demo', page: 2, size: 10 });
    expect(mockGet).toHaveBeenCalledWith('/admin/user/list', {
      params: { keyword: 'demo', page: 2, size: 10 },
    });
  });

  it('createUserApi POST /admin/user', async () => {
    mockPost.mockResolvedValue({ id: 1 });
    const body = {
      nickname: 'x',
      password: 'p',
      username: 'u',
    };
    await createUserApi(body);
    expect(mockPost).toHaveBeenCalledWith('/admin/user', body);
  });

  it('updateUserApi PUT /admin/user/{id}', async () => {
    mockPut.mockResolvedValue({});
    await updateUserApi(5, { nickname: 'y' });
    expect(mockPut).toHaveBeenCalledWith('/admin/user/5', { nickname: 'y' });
  });

  it('resetUserPasswordApi PUT /admin/user/{id}/password', async () => {
    mockPut.mockResolvedValue({});
    await resetUserPasswordApi(7, 'newpw');
    expect(mockPut).toHaveBeenCalledWith('/admin/user/7/password', {
      password: 'newpw',
    });
  });

  it('setUserEnabledApi PUT /admin/user/{id}/enabled', async () => {
    mockPut.mockResolvedValue({});
    await setUserEnabledApi(9, 0);
    expect(mockPut).toHaveBeenCalledWith('/admin/user/9/enabled', {
      enabled: 0,
    });
  });

  it('deleteUserApi DELETE /admin/user/{id}', async () => {
    mockDelete.mockResolvedValue({});
    await deleteUserApi(11);
    expect(mockDelete).toHaveBeenCalledWith('/admin/user/11');
  });

  it('getUserGrantsApi GET /admin/user/{id}/grants', async () => {
    mockGet.mockResolvedValue({ menuIds: [], permissionIds: [] });
    await getUserGrantsApi(13);
    expect(mockGet).toHaveBeenCalledWith('/admin/user/13/grants');
  });

  it('assignUserGrantsApi PUT /admin/user/{id}/grants', async () => {
    mockPut.mockResolvedValue({});
    const data = { menuIds: [1], permissionIds: [2] };
    await assignUserGrantsApi(15, data);
    expect(mockPut).toHaveBeenCalledWith('/admin/user/15/grants', data);
  });

  it('setUserStatusApi PUT /admin/user/{id}/status，bannedUntil null 兜底', async () => {
    mockPut.mockResolvedValue({});
    await setUserStatusApi(17, 'FROZEN');
    expect(mockPut).toHaveBeenCalledWith('/admin/user/17/status', {
      bannedUntil: null,
      status: 'FROZEN',
    });
  });

  it('setUserStatusApi 带 bannedUntil 透传', async () => {
    mockPut.mockResolvedValue({});
    await setUserStatusApi(17, 'BANNED', '2026-12-31T00:00:00');
    expect(mockPut).toHaveBeenCalledWith('/admin/user/17/status', {
      bannedUntil: '2026-12-31T00:00:00',
      status: 'BANNED',
    });
  });

  it('unlockUserApi PUT /admin/user/{id}/unlock', async () => {
    mockPut.mockResolvedValue({});
    await unlockUserApi(19);
    expect(mockPut).toHaveBeenCalledWith('/admin/user/19/unlock');
  });
});
