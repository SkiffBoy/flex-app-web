import type { Plugin } from 'vite';

import { viteImportMaps } from 'vite-import-maps';

/**
 * flex-importmap wrapper：基于 vite-import-maps，把共享 external 注入浏览器原生 importmap。
 *
 * spec §4.5：不使用 Vben 内置的 CDN importmap 插件（importmap.ts，条件 isBuild && importmap，
 * web-antdv-next 不传 importmap:true 即禁用）。本 wrapper 在 dev/build 都生效，
 * 把 vue/pinia/vue-router/antdv-next/@flex/shared 映射到主 Shell 本地提供的同一份。
 *
 * importmap 保证了：插件 bundle 写 `import { ref } from 'vue'` 或
 * `import { usePluginRequest } from '@flex/shared/request'` 时，浏览器解析到主 Shell
 * 的同一份模块，从而共享单例（响应式、provide/inject、pinia store、@flex/shared 的
 * pluginRegistry/httpClient 单例都正确）。
 *
 * **关键**：@flex/shared 必须在 importmap 里，否则插件 bundle 会内联它自己的副本，
 * 导致 setHttpClient（主 Shell 调）与 usePluginRequest（插件调）操作不同模块实例。
 *
 * @param imports 要注入 importmap 的 bare specifiers
 */
export async function flexImportMap(
  imports: string[] = [
    'vue',
    'pinia',
    'vue-router',
    'antdv-next',
    '@flex/shared',
  ],
): Promise<Plugin> {
  return (await viteImportMaps({ imports })) as Plugin;
}
