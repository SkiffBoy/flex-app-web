import { requestClient } from '#/api/request';

export namespace SystemPermissionApi {
  export interface SysPermission {
    createdAt: string;
    description: null | string;
    enabled: number;
    groupCode: string;
    id: number;
    permissionCode: string;
    permissionName: string;
    pluginId: null | string;
  }

  export interface SysPermissionGroup {
    description: null | string;
    enabled: number;
    groupCode: string;
    groupName: string;
    sortOrder: number;
  }
}

export function getPermissionListApi() {
  return requestClient.get<SystemPermissionApi.SysPermission[]>(
    '/admin/permission/list',
  );
}

export function getPermissionGroupListApi() {
  return requestClient.get<SystemPermissionApi.SysPermissionGroup[]>(
    '/admin/permission-group/list',
  );
}

export function createPermissionApi(
  data: Partial<SystemPermissionApi.SysPermission>,
) {
  return requestClient.post('/admin/permission', data);
}

export function updatePermissionApi(
  id: number,
  data: Partial<SystemPermissionApi.SysPermission>,
) {
  return requestClient.put(`/admin/permission/${id}`, data);
}

export function deletePermissionApi(id: number) {
  return requestClient.delete(`/admin/permission/${id}`);
}
