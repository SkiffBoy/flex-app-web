import { requestClient } from '#/api/request';

export namespace SystemUserApi {
  /** 后端 SysUser（snake_case 字段，sqltoy 直接序列化）。 */
  export interface SysUser {
    accountStatus: string; // NORMAL/FROZEN/BANNED
    avatar: null | string;
    bannedUntil: null | string;
    createdAt: string;
    enabled: number; // 0/1
    failedLoginCount: number;
    id: number;
    lastFailedAt: null | string;
    locked: number; // 0/1
    lockedUntil: null | string;
    nickname: null | string;
    passwordChangedAt: string;
    username: string;
    validUntil: null | string;
  }

  export interface UserGrants {
    menuIds: number[];
    permissionIds: number[];
  }
}

/** 用户分页列表响应（后端返回 {rows, total}）。 */
export interface UserPageResult {
  rows: SystemUserApi.SysUser[];
  total: number;
}

/**
 * 用户分页列表（spec §2.2：分页 + username/nickname 模糊）。
 */
export function getUserListApi(params: {
  keyword?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<UserPageResult>('/admin/user/list', { params });
}

export function getUserApi(id: number) {
  return requestClient.get<SystemUserApi.SysUser>(`/admin/user/${id}`);
}

export function createUserApi(data: {
  avatar?: string;
  nickname?: string;
  password: string;
  username: string;
}) {
  return requestClient.post('/admin/user', data);
}

export function updateUserApi(
  id: number,
  data: { avatar?: string; nickname?: string },
) {
  return requestClient.put(`/admin/user/${id}`, data);
}

export function resetUserPasswordApi(id: number, password: string) {
  return requestClient.put(`/admin/user/${id}/password`, { password });
}

export function setUserEnabledApi(id: number, enabled: number) {
  return requestClient.put(`/admin/user/${id}/enabled`, { enabled });
}

export function deleteUserApi(id: number) {
  return requestClient.delete(`/admin/user/${id}`);
}

export function getUserGrantsApi(id: number) {
  return requestClient.get<SystemUserApi.UserGrants>(
    `/admin/user/${id}/grants`,
  );
}

export function assignUserGrantsApi(
  id: number,
  data: { menuIds: number[]; permissionIds: number[] },
) {
  return requestClient.put(`/admin/user/${id}/grants`, data);
}

/** 状态操作：NORMAL/FROZEN/BANNED（bannedUntil 可选，null=永久）。 */
export function setUserStatusApi(
  id: number,
  status: string,
  bannedUntil?: null | string,
) {
  return requestClient.put(`/admin/user/${id}/status`, {
    bannedUntil: bannedUntil ?? null,
    status,
  });
}

/** 解锁（清 locked/failedLoginCount）。 */
export function unlockUserApi(id: number) {
  return requestClient.put(`/admin/user/${id}/unlock`);
}
