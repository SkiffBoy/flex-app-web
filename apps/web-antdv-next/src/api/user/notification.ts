import { requestClient } from '#/api/request';

export interface NotificationVo {
  actionUrl: null | string;
  bizId: string;
  bizType: string;
  category: string;
  createdAt: string;
  id: number;
  isRead: number;
  priority: string;
  title: string;
  type: string;
}

export interface NotificationPageResult {
  rows: NotificationVo[];
  total: number;
}

export interface PreferenceItem {
  category: string;
  channel: string;
  dndEnabled: number;
  dndEnd: string;
  dndStart: string;
  enabled: number;
}

export function getNotificationListApi(params: {
  category?: string;
  isRead?: number;
  pageNo?: number;
  pageSize?: number;
  type?: string;
}) {
  return requestClient.get<NotificationPageResult>('/user/notifications', {
    params,
  });
}

export function getUnreadCountApi() {
  return requestClient.get<number>('/user/notifications/unread-count');
}

export function markReadApi(id: number) {
  // RequestClient 无 patch 快捷方法，用通用 request 指定 method
  return requestClient.request(`/user/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllReadApi() {
  return requestClient.request('/user/notifications/read-all', {
    method: 'PATCH',
  });
}

export function deleteNotificationApi(id: number) {
  return requestClient.delete(`/user/notifications/${id}`);
}

export function getPreferencesApi() {
  return requestClient.get<PreferenceItem[]>(
    '/user/notification/preferences',
  );
}

export function updatePreferencesApi(body: { items: PreferenceItem[] }) {
  return requestClient.put('/user/notification/preferences', body);
}
