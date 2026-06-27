import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vue(),
    // 强制 @flex/shared 真正 external：Vite lib 模式会把 workspace 依赖（exports
    // 指向 src/*.ts）当源码打包，仅靠 rollupOptions.external 不够。此插件在 resolveId
    // 阶段拦截 @flex/shared 的所有子路径导入，返回 { external: true }，让 bundle 保留
    // bare import，运行时由浏览器 importmap 解析到主 Shell 的同一份（单例正确）。
    {
      name: 'force-flex-shared-external',
      enforce: 'pre',
      resolveId(source) {
        if (source === '@flex/shared' || source.startsWith('@flex/shared/')) {
          return { id: source, external: true };
        }
        return null;
      },
    },
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'pinia', 'antdv-next', '@flex/shared'],
      output: {
        // 无 globals——ESM 走 importmap，不靠 window（spec §7.4）
        entryFileNames: 'index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
