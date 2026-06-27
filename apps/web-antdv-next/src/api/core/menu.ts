import type { SysMenu } from './menu-transform';

import { requestClient } from '#/api/request';

// 纯逻辑（建树/字段映射）抽到独立模块，便于单测且不依赖 requestClient
export { type SysMenu, transformMenus } from './menu-transform';

/**
 * 获取用户所有菜单（后端返回扁平 SysMenu[]，前端建树并映射为 Vben 契约）。
 */
export async function getAllMenusApi() {
  const { transformMenus } = await import('./menu-transform');
  const list = await requestClient.get<SysMenu[]>('/menu/all');
  return transformMenus(list ?? []);
}
