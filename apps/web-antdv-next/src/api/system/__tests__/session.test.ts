import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAdminSessionApi,
  getAdminSessionListApi,
  kickoutSessionApi,
  kickoutUserSessionsApi,
} from '../session';

const mockGet = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { delete: mockDelete, get: mockGet };
  },
}));

describe('system/session API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockDelete].forEach((m) => m.mockReset());
  });

  it('getAdminSessionListApi 无参调 /admin/sessions', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getAdminSessionListApi({});
    expect(mockGet).toHaveBeenCalledWith('/admin/sessions', { params: {} });
  });

  it('getAdminSessionListApi 带 userId/deviceType/page/size', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getAdminSessionListApi({
      deviceType: 'WEB',
      page: 1,
      size: 20,
      userId: 5,
    });
    expect(mockGet).toHaveBeenCalledWith('/admin/sessions', {
      params: { deviceType: 'WEB', page: 1, size: 20, userId: 5 },
    });
  });

  it('getAdminSessionApi GET /admin/sessions/{sessionId}', async () => {
    mockGet.mockResolvedValue({});
    await getAdminSessionApi('abc-123');
    expect(mockGet).toHaveBeenCalledWith('/admin/sessions/abc-123');
  });

  it('kickoutSessionApi DELETE /admin/sessions/{sessionId}', async () => {
    mockDelete.mockResolvedValue(undefined);
    await kickoutSessionApi('abc-123');
    expect(mockDelete).toHaveBeenCalledWith('/admin/sessions/abc-123');
  });

  it('kickoutUserSessionsApi DELETE /admin/sessions/user/{userId}', async () => {
    mockDelete.mockResolvedValue(undefined);
    await kickoutUserSessionsApi(7);
    expect(mockDelete).toHaveBeenCalledWith('/admin/sessions/user/7');
  });
});
