import { appCopyrightPreferences, defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    accessMode: 'backend', // 后端菜单驱动（GET /api/menu/all → generateAccessible）
    enableRefreshToken: true, // 开启 token 自动刷新（401 → /auth/refresh 续期）
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: appCopyrightPreferences,
});
