import { defineConfig, flexImportMap } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    // 不传 importmap: true，禁用 Vben 内置 CDN importmap 插件（spec §4.5）
    // 改用下方 flexImportMap（基于 vite-import-maps，dev/build 都生效）
    application: {},
    vite: {
      plugins: [
        // 注入浏览器原生 importmap：vue/pinia/vue-router/antdv-next/@flex/shared → 主 Shell 本地一份
        // 插件 bundle 的 bare import 走 importmap 解析，共享单例（spec §4.5 R1）
        // @flex/shared 必须在内：否则插件内联副本，setHttpClient 与 usePluginRequest 不同实例
        await flexImportMap([
          'vue',
          'pinia',
          'vue-router',
          'antdv-next',
          '@flex/shared',
        ]),
      ],
      server: {
        proxy: {
          // ===== P1 auth 闭环代理 → 真实后端（后端 controller 带 /api 前缀）=====
          // 注意：这些路由【不 rewrite】/api 前缀，因为后端 controller 映射为
          // /api/auth、/api/user、/api/menu、/api/admin（见 AuthController 等）。
          // 与下方 /api/demo（rewrite 去前缀，controller 在 /demo）语义不同，不可混用。
          // 必须在 /api 之前匹配（Vite 按声明顺序 + 更具体路径优先）。
          '/api/auth': { changeOrigin: true, target: 'http://localhost:8080' },
          '/api/user': { changeOrigin: true, target: 'http://localhost:8080' },
          '/api/menu': { changeOrigin: true, target: 'http://localhost:8080' },
          '/api/admin': { changeOrigin: true, target: 'http://localhost:8080' },
          // 插件元数据 API → 真实后端（后端 flex-core 提供 /api/extensions/metadata）
          // 必须在 /api 之前，更具体的路径优先匹配
          '/api/extensions': {
            changeOrigin: true,
            target: 'http://localhost:8080',
          },
          // 插件业务 API → 真实后端（plugin-demo 的 controller 挂在 /demo）。
          // 插件用主 Shell 注入的 requestClient（baseURL=/api），所以实际请求是
          // /api/demo/hello、/api/demo/fail。代理 /api/demo → 后端 8080，并 rewrite 去掉
          // /api 前缀（后端 controller 在 /demo，sbp 接入主应用 /**）。
          // 注意：必须在 /api 之前匹配（更具体的路径优先）。
          '/api/demo': {
            changeOrigin: true,
            target: 'http://localhost:8080',
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
          // P2 业务页 API → 真实后端（/api/system/dict、/api/system/file 等落此前缀，
          // 不 rewrite /api，后端 controller 带 /api 前缀）
          '/api/system': { changeOrigin: true, target: 'http://localhost:8080' },
          // SSE 实时推送 → 真实后端（EventSource 不支持自定义 header，须直连）
          '/api/sse': { changeOrigin: true, target: 'http://localhost:8080' },
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://localhost:5320/api',
            ws: true,
          },
          // 插件静态资源代理到真实后端：flex-core 的 PluginStaticResourceConfig
          // （URL 方案 2）服务 /static/{pluginId}/**。dev 下通过此代理让浏览器
          // 能拿到 /static/{pluginId}/index.js 及其 chunks
          '/static': {
            changeOrigin: true,
            target: 'http://localhost:8080',
          },
        },
      },
    },
  };
});
