import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getConfigApi,
  getConfigListApi,
  getSecurityPolicyApi,
  updateConfigApi,
} from '../config';

const mockGet = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet, put: mockPut };
  },
}));

describe('system/config API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPut].forEach((m) => m.mockReset());
  });

  it('getConfigListApi GET /admin/config/list', async () => {
    mockGet.mockResolvedValue([
      {
        configClass: 'com.skiffboy.core.config.security.SecurityPolicy',
        configType: 'APP',
        displayName: '安全策略',
        pluginId: null,
        simpleName: 'SecurityPolicy',
      },
    ]);
    const res = await getConfigListApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/config/list');
    expect(res).toHaveLength(1);
    expect(res[0]?.simpleName).toBe('SecurityPolicy');
  });

  it('getConfigApi 按路径参数调 /admin/config/{configClass}', async () => {
    mockGet.mockResolvedValue({
      defaultValue: {},
      source: 'YAML',
      value: {},
      yamlValue: {},
    });
    await getConfigApi('SecurityPolicy');
    expect(mockGet).toHaveBeenCalledWith('/admin/config/SecurityPolicy');
  });

  it('updateConfigApi PUT /admin/config/{configClass}', async () => {
    mockPut.mockResolvedValue({});
    const policy = { minLength: 12 };
    await updateConfigApi('SecurityPolicy', policy);
    expect(mockPut).toHaveBeenCalledWith(
      '/admin/config/SecurityPolicy',
      policy,
    );
  });

  it('getSecurityPolicyApi 便捷封装等价 getConfigApi(SecurityPolicy)', async () => {
    mockGet.mockResolvedValue({
      defaultValue: {},
      source: 'YAML',
      value: {},
      yamlValue: {},
    });
    await getSecurityPolicyApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/config/SecurityPolicy');
  });
});
