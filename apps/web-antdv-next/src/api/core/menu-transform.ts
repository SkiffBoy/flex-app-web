import type { RouteRecordStringComponent } from '@vben/types';

/**
 * 后端 SysMenu 扁平结构（GET /api/menu/all 返回的扁平数组，前端建树）。
 * 字段为后端 snake_case（sqltoy 直接序列化实体），meta 为 JSON 字符串。
 */
export interface SysMenu {
  component: null | string;
  enabled: number;
  icon: null | string;
  id: number;
  meta: null | string;
  menuName: string;
  menuType: string; // catalog/menu/embedded/link
  parentId: null | number;
  path: null | string;
  permissionCode: null | string;
  redirect: null | string;
  routeName: string;
  sortOrder: number;
  visible: number;
}

/**
 * 将后端扁平 SysMenu[] 转为 Vben 期望的 RouteRecordStringComponent 树。
 * （纯函数，无副作用，独立于 requestClient 便于单测）
 *
 * 映射：
 * - routeName → name（Vben 必填，路由名）
 * - menuName → meta.title
 * - meta(JSON 字符串) → 解析为对象，合并 icon/order
 * - component → 保留（Vben 用 import.meta.glob 按 /xxx/yyy.vue 匹配，前导 / 由其 normalize）
 * - parentId → children 树
 * - sortOrder → meta.order
 */
export function transformMenus(list: SysMenu[]): RouteRecordStringComponent[] {
  // 先把每个节点转为 Vben 形态（仍扁平），用 Map 便于建树
  type VbenNode = RouteRecordStringComponent & { _parentId: null | number };

  const nodes = new Map<number, VbenNode>();
  for (const item of list) {
    // meta：后端存 JSON 字符串（如 {"title":"用户管理"}），解析失败则空对象
    let metaObj: Record<string, any> = {};
    if (item.meta) {
      try {
        metaObj = JSON.parse(item.meta);
      } catch {
        metaObj = {};
      }
    }
    // 合并：icon/sortOrder/title 以实体字段为补充（meta 优先，避免重复维护）
    if (item.icon && metaObj.icon === undefined) {
      metaObj.icon = item.icon;
    }
    if (item.menuName && metaObj.title === undefined) {
      metaObj.title = item.menuName;
    }
    if (item.sortOrder !== undefined && metaObj.order === undefined) {
      metaObj.order = item.sortOrder;
    }

    const node: VbenNode = {
      _parentId: item.parentId,
      component: (item.component ?? undefined) as any,
      meta: metaObj as any,
      name: item.routeName,
      path: item.path ?? '',
      ...(item.redirect ? { redirect: item.redirect } : {}),
    };
    nodes.set(item.id, node);
  }

  // 建 children 树（保留完整 VbenNode 引用，深层嵌套才不断链；最后统一 strip）
  const roots: VbenNode[] = [];
  for (const node of nodes.values()) {
    const parent =
      node._parentId === null ? undefined : nodes.get(node._parentId);
    if (parent) {
      (parent as any).children ??= [];
      (parent as any).children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 按 meta.order 升序排序（稳定的目录/菜单位次）
  roots.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0));

  // 最后统一剥离内部字段 _parentId（递归，含所有层级 children）
  return roots.map((n) => stripInternal(n));
}

/** 去掉内部辅助字段 _parentId（递归 children），避免污染 Vben 路由对象。 */
function stripInternal(node: any): RouteRecordStringComponent {
  const { _parentId, children, ...rest } = node;
  if (Array.isArray(children)) {
    rest.children = children.map((c: any) => stripInternal(c));
  }
  return rest;
}
