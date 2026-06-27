import type { PluginMetadata } from '@flex/shared';

import { defineStore } from 'pinia';

interface PluginState {
  /** 已加载的插件元数据（用于菜单/路由渲染） */
  loadedPlugins: PluginMetadata[];
  /** 是否已初始化（loadAllPlugins 跑完） */
  initialized: boolean;
}

/**
 * 插件 store：记录本次会话已成功加载的插件。
 * 由 guard 在首次鉴权后调 loadAllPlugins 时填充。
 */
export const usePluginStore = defineStore('flex-plugin', {
  state: (): PluginState => ({
    loadedPlugins: [],
    initialized: false,
  }),
  actions: {
    setLoaded(plugins: PluginMetadata[]) {
      this.loadedPlugins = plugins;
      this.initialized = true;
    },
    /** 提取所有插件的菜单声明（供 layout 菜单注入，spec §5.4） */
    getAllMenus() {
      return this.loadedPlugins.flatMap((p) => p.menus ?? []);
    },
  },
});
