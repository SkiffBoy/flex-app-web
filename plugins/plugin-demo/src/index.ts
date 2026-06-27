import type { PluginManifest } from '@flex/shared/types';

const manifest: PluginManifest = {
  pluginId: 'plugin-demo',
  routes: [
    {
      path: '/demo',
      name: 'PluginDemoHome',
      component: () => import('./views/home.vue'),
      meta: { title: '示例插件', icon: 'lucide:puzzle', hideInMenu: false },
    },
    {
      path: '/demo/fail',
      name: 'PluginDemoFail',
      component: () => import('./views/fail.vue'),
      meta: { title: '故障演示', hideInMenu: true },
    },
  ],
  menus: [{ name: '示例插件', path: '/demo', icon: 'lucide:puzzle' }],
};

export default manifest;
