import { beforeEach, describe, expect, it, vi } from 'vitest';

import { changePasswordApi, getAccessCodesApi, loginApi } from '../auth';

const mockPost = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

// vi.mock 被 vitest 提升到 import 之前执行（mock requestClient + baseRequestClient）
vi.mock('#/api/request', () => ({
  get baseRequestClient() {
    return { post: mockPost };
  },
  get requestClient() {
    return { get: mockGet, post: mockPost };
  },
}));

describe('auth API 端点契约', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
  });

  it('loginApi 调 /auth/login 并透传 captchaCode/captchaKey/username/password', async () => {
    mockPost.mockResolvedValue({
      tokenName: 'Flex-Token',
      tokenValue: 'tok-123',
    });
    const res = await loginApi({
      captchaCode: 'flex',
      captchaKey: 'key-1',
      password: 'pw',
      username: 'admin',
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      captchaCode: 'flex',
      captchaKey: 'key-1',
      password: 'pw',
      username: 'admin',
    });
    expect(res.tokenValue).toBe('tok-123');
  });

  it('getAccessCodesApi 调 /user/permissions', async () => {
    mockGet.mockResolvedValue(['*']);
    const res = await getAccessCodesApi();
    expect(mockGet).toHaveBeenCalledWith('/user/permissions');
    expect(res).toEqual(['*']);
  });

  it('changePasswordApi 调 /auth/change-password 透传 oldPassword/newPassword', async () => {
    mockPost.mockResolvedValue({ code: 'ok' });
    await changePasswordApi({
      newPassword: 'New123!@#',
      oldPassword: 'Old123!@#',
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
      newPassword: 'New123!@#',
      oldPassword: 'Old123!@#',
    });
  });
});
