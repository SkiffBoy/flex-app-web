import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserInfoApi } from '../user';

const mockGet = vi.hoisted(() => vi.fn());

// vi.mock 被 vitest 提升到 import 之前执行（mock requestClient，只拦截 get）
vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet };
  },
}));

describe('getUserInfoApi 字段映射', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('超管映射：nickname→realName, isSuper→roles(["super"])', async () => {
    mockGet.mockResolvedValue({
      avatar: null,
      isSuper: true,
      nickname: '超级管理员',
      username: 'admin',
    });
    const info = await getUserInfoApi();
    expect(info.realName).toBe('超级管理员');
    expect(info.username).toBe('admin');
    expect(info.roles).toEqual(['super']);
    expect(info.userId).toBe('-1');
    expect(info.avatar).toBe('');
  });

  it('普通用户映射：roles 为空数组', async () => {
    mockGet.mockResolvedValue({
      avatar: 'https://x.com/a.png',
      isSuper: false,
      nickname: '张三',
      username: 'zhangsan',
    });
    const info = await getUserInfoApi();
    expect(info.realName).toBe('张三');
    expect(info.roles).toEqual([]);
    expect(info.avatar).toBe('https://x.com/a.png');
    expect(info.userId).toBe('zhangsan');
  });

  it('nickname 缺失时回退 username 作为 realName', async () => {
    mockGet.mockResolvedValue({
      avatar: null,
      isSuper: false,
      nickname: null,
      username: 'fallback',
    });
    const info = await getUserInfoApi();
    expect(info.realName).toBe('fallback');
  });

  it('调用端点 /user/info', async () => {
    mockGet.mockResolvedValue({
      avatar: null,
      isSuper: false,
      nickname: 'x',
      username: 'x',
    });
    await getUserInfoApi();
    expect(mockGet).toHaveBeenCalledWith('/user/info');
  });
});
