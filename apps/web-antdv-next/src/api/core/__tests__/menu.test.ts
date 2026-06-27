import type { RouteRecordStringComponent } from '@vben/types';

import type { SysMenu } from '../menu-transform';

import { describe, expect, it } from 'vitest';

import { transformMenus } from '../menu-transform';

/** 取树首元素（断言非空，绕过 no-non-null-assertion + 类型收窄）。 */
function first(list: RouteRecordStringComponent[]): RouteRecordStringComponent {
  expect(list.length).toBeGreaterThan(0);
  return list[0] as RouteRecordStringComponent;
}

/** 造一个扁平 SysMenu（仅填关键字段）。 */
function mk(partial: Partial<SysMenu>): SysMenu {
  return {
    component: null,
    enabled: 1,
    icon: null,
    id: 0,
    menuName: '',
    menuType: 'menu',
    meta: null,
    parentId: null,
    path: '',
    permissionCode: null,
    redirect: null,
    routeName: '',
    sortOrder: 0,
    visible: 1,
    ...partial,
  };
}

describe('transformMenus', () => {
  it('空数组返回空数组', () => {
    expect(transformMenus([])).toEqual([]);
  });

  it('扁平转树：parentId 正确建父子关系', () => {
    const list: SysMenu[] = [
      mk({ id: 1, routeName: 'System', path: '/system', menuType: 'catalog' }),
      mk({
        id: 2,
        parentId: 1,
        routeName: 'SystemUser',
        path: '/system/user',
        component: 'system/user/index',
      }),
    ];
    const root = first(transformMenus(list));
    expect(root).toBeDefined();
    expect(root.name).toBe('System');
    expect(root.children).toHaveLength(1);
    expect(root.children?.[0]?.name).toBe('SystemUser');
  });

  it('孤儿节点（parentId 指向不存在）提升为根', () => {
    const list: SysMenu[] = [
      mk({ id: 2, parentId: 999, routeName: 'Orphan', path: '/orphan' }),
    ];
    const root = first(transformMenus(list));
    expect(root.name).toBe('Orphan');
    expect(root.children).toBeUndefined();
  });

  it('字段映射：routeName→name, menuName→meta.title, component 保留', () => {
    const list: SysMenu[] = [
      mk({
        component: 'analytics/index',
        id: 1,
        menuName: '数据分析',
        routeName: 'Analytics',
        path: '/analytics',
      }),
    ];
    const node = first(transformMenus(list));
    expect(node.name).toBe('Analytics');
    expect(node.path).toBe('/analytics');
    expect(node.component).toBe('analytics/index');
    expect(node.meta?.title).toBe('数据分析');
  });

  it('meta JSON 字符串解析为对象', () => {
    const list: SysMenu[] = [
      mk({
        id: 1,
        meta: '{"title":"首页","order":5}',
        routeName: 'Home',
      }),
    ];
    const node = first(transformMenus(list));
    expect(node.meta?.title).toBe('首页');
    expect(node.meta?.order).toBe(5);
  });

  it('meta 解析失败兜底（不抛错，sortOrder 仍兜底进 meta.order）', () => {
    const list: SysMenu[] = [mk({ id: 1, meta: 'not-json', routeName: 'X' })];
    expect(() => transformMenus(list)).not.toThrow();
    const node = first(transformMenus(list));
    expect(node.meta?.order).toBe(0);
  });

  it('icon/sortOrder 兜底进 meta（实体字段补 meta 缺失）', () => {
    const list: SysMenu[] = [
      mk({
        icon: 'lucide:user',
        id: 1,
        routeName: 'X',
        sortOrder: 99,
      }),
    ];
    const node = first(transformMenus(list));
    expect(node.meta?.icon).toBe('lucide:user');
    expect(node.meta?.order).toBe(99);
  });

  it('redirect 字段存在时携带，缺失时不出现', () => {
    const withRedirect = first(
      transformMenus([mk({ id: 1, redirect: '/home', routeName: 'A' })]),
    );
    expect((withRedirect as Record<string, unknown>).redirect).toBe('/home');

    const noRedirect = first(
      transformMenus([mk({ id: 1, redirect: null, routeName: 'B' })]),
    );
    expect((noRedirect as Record<string, unknown>).redirect).toBeUndefined();
  });

  it('根节点按 meta.order 升序排序', () => {
    const list: SysMenu[] = [
      mk({ id: 1, routeName: 'High', sortOrder: 99 }),
      mk({ id: 2, routeName: 'Low', sortOrder: 1 }),
      mk({ id: 3, routeName: 'Mid', sortOrder: 50 }),
    ];
    const tree = transformMenus(list);
    expect(tree.map((n) => n.name)).toEqual(['Low', 'Mid', 'High']);
  });

  it('内部辅助字段 _parentId 不泄露到结果', () => {
    const node = first(transformMenus([mk({ id: 1, routeName: 'X' })]));
    expect((node as Record<string, unknown>)._parentId).toBeUndefined();
  });

  it('多级嵌套（祖→父→子）正确递归建树', () => {
    const list: SysMenu[] = [
      mk({ id: 1, routeName: 'L0', path: '/l0', menuType: 'catalog' }),
      mk({
        id: 2,
        parentId: 1,
        routeName: 'L1',
        path: '/l0/l1',
        menuType: 'catalog',
      }),
      mk({
        id: 3,
        parentId: 2,
        routeName: 'L2',
        path: '/l0/l1/l2',
        component: 'leaf',
      }),
    ];
    const l0 = first(transformMenus(list));
    const l1 = l0.children?.[0];
    expect(l1).toBeDefined();
    expect(l1?.children).toHaveLength(1);
    expect(l1?.children?.[0]?.name).toBe('L2');
  });
});
