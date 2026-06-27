import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { message } from 'antdv-next';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore, usePluginStore } from '#/store';

import { generateAccess } from './access';
import { loadAllPlugins } from './plugin-routes';

// auth.kickout 事件仅订阅一次（跨导航守卫，useSSE 为单例）
let kickoutBound = false;

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // 基本路由，这些路由不需要进入权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      // 密码过期软拒（spec §4.5.5）：除改密页/登录页外，强制跳改密页
      if (
        authStore.passwordExpired &&
        to.name !== 'ChangePassword' &&
        to.name !== 'Login'
      ) {
        return { path: '/auth/change-password', replace: true };
      }
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      return true;
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          // 如不需要，直接删除 query
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          // 携带当前跳转的页面，登录后重新跳转该页面
          replace: true,
        };
      }
      return to;
    }

    // 是否已经生成过动态路由
    if (accessStore.isAccessChecked) {
      // 密码过期软拒：已生成路由也强制跳改密页（防止改密前进入业务页）
      if (authStore.passwordExpired) {
        return { path: '/auth/change-password', replace: true };
      }
      return true;
    }

    // 生成路由表
    // 当前登录用户拥有的角色标识列表
    const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
    const userRoles = userInfo.roles ?? [];

    // 生成菜单和路由
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      // 则会在菜单中显示，但是访问会被重定向到403
      routes: accessRoutes,
    });

    // 保存菜单信息和路由信息
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);

    // 动态加载插件（spec §4.2）：拉 metadata → import bundle → addRoute。
    // 放在 setIsAccessChecked 之前，让首次重定向能命中已注入的插件路由。
    const pluginStore = usePluginStore();
    if (!pluginStore.initialized) {
      const loaded = await loadAllPlugins(router);
      pluginStore.setLoaded(loaded);

      // 注入插件菜单到侧边栏（spec §5.4）：把插件声明的菜单追加到 accessMenus。
      const pluginMenus = pluginStore.getAllMenus();
      if (pluginMenus.length > 0) {
        accessStore.setAccessMenus([
          ...accessStore.accessMenus,
          ...pluginMenus.map((m) => ({
            path: m.path,
            name: m.name,
            icon: m.icon,
          })),
        ]);
      }
    }

    accessStore.setIsAccessChecked(true);

    // SSE 实时推送（spec §4）：登录后建立连接，通知/踢出共用
    const { useSSE } = await import('#/composables/use-sse');
    const sse = useSSE();
    sse.connect();
    // 被管理员踢出/其他设备登录 → 登出并提示（守卫仅订阅一次）
    if (!kickoutBound) {
      sse.on('auth.kickout', () => {
        message.warning('您的账号已被管理员强制下线');
        authStore.logout();
      });
      kickoutBound = true;
    }
    const redirectPath = (from.query.redirect ??
      (to.path === preferences.app.defaultHomePath
        ? userInfo.homePath || preferences.app.defaultHomePath
        : to.fullPath)) as string;

    return {
      ...router.resolve(decodeURIComponent(redirectPath)),
      replace: true,
    };
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
