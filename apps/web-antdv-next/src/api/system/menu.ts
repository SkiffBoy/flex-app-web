import { requestClient } from '#/api/request';

export namespace SystemMenuApi {
  /** 后端 SysMenu（扁平，parentId 建树）。 */
  export interface SysMenu {
    component: null | string;
    enabled: number;
    icon: null | string;
    id: number;
    menuName: string;
    menuType: string; // catalog/menu/embedded/link
    meta: null | string; // JSON 字符串
    parentId: null | number;
    path: null | string;
    permissionCode: null | string;
    redirect: null | string;
    routeName: string;
    sortOrder: number;
    visible: number;
  }
}

export function getMenuListApi() {
  return requestClient.get<SystemMenuApi.SysMenu[]>('/admin/menu/list');
}

export function createMenuApi(data: Partial<SystemMenuApi.SysMenu>) {
  return requestClient.post('/admin/menu', data);
}

export function updateMenuApi(
  id: number,
  data: Partial<SystemMenuApi.SysMenu>,
) {
  return requestClient.put(`/admin/menu/${id}`, data);
}

export function deleteMenuApi(id: number) {
  return requestClient.delete(`/admin/menu/${id}`);
}
