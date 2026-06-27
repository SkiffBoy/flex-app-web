import type { PluginManifest } from '../types';

import { reportError } from '../error-reporter';
import { pluginRegistry } from '../registry';

/**
 * 动态 import 插件 bundle + 降级（spec §4.2 加载阶段）。
 *
 * @vite-ignore 必须加，否则 Vite dev server 会尝试预打包这个动态 import。
 */
export async function loadPlugin(
  entryUrl: string,
  pluginId: string,
): Promise<PluginManifest> {
  try {
    const mod = await import(/* @vite-ignore */ entryUrl);
    if (!mod.default || mod.default.pluginId !== pluginId) {
      throw new Error(
        `插件 ${pluginId} 入口 ${entryUrl} 未导出有效的 PluginManifest（pluginId 不匹配或缺失 default 导出）`,
      );
    }
    const manifest = mod.default as PluginManifest;
    pluginRegistry.markLoaded(pluginId, manifest);
    return manifest;
  } catch (error_) {
    const error = error_ as Error;
    pluginRegistry.markFailed(pluginId, error);
    reportError(error, pluginId);
    throw error; // 向上抛，由 loadAllPlugins 决定是否继续加载其他插件
  }
}
