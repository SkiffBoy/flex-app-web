import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteNotificationApi,
  getNotificationListApi,
  getPreferencesApi,
  getUnreadCountApi,
  markAllReadApi,
  markReadApi,
  updatePreferencesApi,
} from '../notification';

const mockGet = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockRequest = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return {
      delete: mockDelete,
      get: mockGet,
      put: mockPut,
      request: mockRequest,
    };
  },
}));

describe('user/notification API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPut, mockDelete, mockRequest].forEach((m) => m.mockReset());
  });

  it('getNotificationListApi 透传分页 + 过滤', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getNotificationListApi({ isRead: 0, pageNo: 1, pageSize: 20 });
    expect(mockGet).toHaveBeenCalledWith('/user/notifications', {
      params: { isRead: 0, pageNo: 1, pageSize: 20 },
    });
  });

  it('getUnreadCountApi GET unread-count', async () => {
    mockGet.mockResolvedValue(0);
    await getUnreadCountApi();
    expect(mockGet).toHaveBeenCalledWith('/user/notifications/unread-count');
  });

  it('markReadApi PATCH /user/notifications/{id}/read', async () => {
    mockRequest.mockResolvedValue(undefined);
    await markReadApi(5);
    expect(mockRequest).toHaveBeenCalledWith('/user/notifications/5/read', {
      method: 'PATCH',
    });
  });

  it('markAllReadApi PATCH read-all', async () => {
    mockRequest.mockResolvedValue(undefined);
    await markAllReadApi();
    expect(mockRequest).toHaveBeenCalledWith(
      '/user/notifications/read-all',
      { method: 'PATCH' },
    );
  });

  it('deleteNotificationApi DELETE /user/notifications/{id}', async () => {
    mockDelete.mockResolvedValue(undefined);
    await deleteNotificationApi(5);
    expect(mockDelete).toHaveBeenCalledWith('/user/notifications/5');
  });

  it('getPreferencesApi GET preferences', async () => {
    mockGet.mockResolvedValue([]);
    await getPreferencesApi();
    expect(mockGet).toHaveBeenCalledWith('/user/notification/preferences');
  });

  it('updatePreferencesApi PUT preferences（body 含 items）', async () => {
    mockPut.mockResolvedValue(undefined);
    const items = [
      {
        category: 'SYS',
        channel: 'WEB',
        dndEnabled: 0,
        dndEnd: '',
        dndStart: '',
        enabled: 1,
      },
    ];
    await updatePreferencesApi({ items });
    expect(mockPut).toHaveBeenCalledWith('/user/notification/preferences', {
      items,
    });
  });
});
