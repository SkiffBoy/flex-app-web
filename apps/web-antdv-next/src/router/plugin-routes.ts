import type { Router, RouteRecordRaw } from 'vue-router';

import { defineAsyncComponent, h } from 'vue';

import { loadPlugin, pluginRegistry, PluginWrapper } from '@flex/shared';

import { getPluginMetadata } from '#/api/plugin';

/**
 * 动态加载所有插件：metadata → 注册 → 动态 import bundle → addRoute。
 *
 * 容错：单个插件加载失败不阻塞其他插件（catch 在 for 循环内）。
 * spec §4.2 加载阶段。
 *
 * @param router 主 Shell 路由实例
 * @returns 本次成功加载的插件元数据（供 store 记录 + 菜单注入）
 */
export async function loadAllPlugins(router: Router) {
  let metadataList: Awaited<ReturnType<typeof getPluginMetadata>>;
  try {
    metadataList = await getPluginMetadata();
  } catch (error) {
    console.error('[plugin] 拉取插件元数据失败，跳过插件加载', error);
    return [];
  }

  // 注册到 registry（loadPlugin 内部也会用 registry 标记状态）
  pluginRegistry.register(metadataList);

  const loaded: typeof metadataList = [];
  for (const metadata of metadataList) {
    try {
      const manifest = await loadPlugin(metadata.entryUrl, metadata.pluginId);
      // 以 Manifest 的 routes 为权威注入（spec §5.3）
      if (manifest.routes) {
        for (const route of manifest.routes) {
          const record = buildPluginRoute(route, metadata.pluginId);
          if (record) {
            router.addRoute(record);
          }
        }
      }
      loaded.push(metadata);
    } catch (error) {
      // loadPlugin 已上报，这里仅 log，继续加载其他插件
      console.warn(
        `[plugin] 插件 ${metadata.pluginId} 加载失败，已跳过`,
        error,
      );
    }
  }
  return loaded;
}

/**
 * 把插件的懒加载 component 包进 PluginWrapper（错误隔离），
 * 生成顶层 RouteRecordRaw（parent: pluginId，便于统一管理/卸载）。
 */
function buildPluginRoute(
  route: {
    component: () => Promise<any>;
    meta?: Record<string, any>;
    name: string;
    path: string;
  },
  pluginId: string,
): null | RouteRecordRaw {
  try {
    const Original = defineAsyncComponent(route.component);
    const Wrapped = defineAsyncComponent({
      // 用 h 包一层 PluginWrapper，错误不冒泡到主应用
      loader: async () => ({
        render: () => h(PluginWrapper, { pluginId }, () => h(Original)),
      }),
    });
    return {
      path: route.path,
      name: route.name,
      component: Wrapped,
      meta: {
        ...route.meta,
        // 标记来源插件，便于权限/菜单过滤
        _pluginId: pluginId,
        title: route.meta?.title ?? pluginId,
        // 插件路由默认需要登录态（沿用 access guard）
        authority: route.meta?.authority ?? ['*'],
      },
    };
  } catch (error) {
    console.warn(`[plugin] 构建路由 ${route.path} 失败`, error);
    return null;
  }
}
