/**
 * 后端 metadata API 返回的元数据（对齐 03 §7.2，修正 code 类型）。
 */
export interface PluginMetadata {
  /** 走 sbp /** 解析，例：'/static/plugin-demo/index.js' */
  entryUrl: string;
  menus?: PluginMenuDeclaration[];
  name: string;
  pluginId: string;
  /** 来自 plugin.properties 的 plugin.routes（JSON），component 为字符串路径可省略 */
  routes?: PluginRouteDeclaration[];
  version: string;
}

/**
 * properties 里声明的"声明式"路由（component 是字符串路径）。
 */
export interface PluginRouteDeclaration {
  /** './views/index.vue'，可省略（真实组件由 bundle 提供） */
  component?: string;
  meta?: Record<string, any>;
  name: string;
  path: string;
}

export interface PluginMenuDeclaration {
  icon?: string;
  name: string;
  path: string;
}

/**
 * 插件 bundle 入口导出的清单（插件作者实现）。
 * component 用懒加载函数（bundle 内部的 import()，不走 importmap）。
 */
export interface PluginManifest {
  /** 插件初始化钩子（可选） */
  install?: (ctx: PluginInstallContext) => Promise<void> | void;
  menus?: PluginMenuDeclaration[];
  pluginId: string;
  /** 以 Manifest 为准注入路由（权威），properties 的 routes 仅作展示 */
  routes?: PluginRoute[];
}

export interface PluginRoute {
  /** () => import('./views/index.vue') */
  component: () => Promise<any>;
  meta?: Record<string, any>;
  name: string;
  path: string;
}

export interface PluginInstallContext {
  pluginId: string;
  reportError: (err: Error) => void;
}
