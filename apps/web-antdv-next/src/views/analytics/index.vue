<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { Card } from 'antdv-next';

defineOptions({ name: 'Analytics' });

const router = useRouter();
const userStore = useUserStore();

const displayName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || '用户',
);
const avatar = computed(
  () => userStore.userInfo?.avatar || preferences.app.defaultAvatar,
);
const isSuper = computed(() =>
  (userStore.userInfo?.roles ?? []).includes('super'),
);

/** 快捷入口：超管可见全部，普通用户按授权（此处给通用入口，路由守卫按权限拦截）。 */
const shortcuts = [
  {
    title: '用户管理',
    desc: '用户 CRUD 与授权',
    path: '/system/user',
    icon: '👥',
  },
  { title: '菜单管理', desc: '菜单树维护', path: '/system/menu', icon: '📑' },
  {
    title: '权限管理',
    desc: '权限点维护',
    path: '/system/permission',
    icon: '🔐',
  },
  {
    title: '配置管理',
    desc: '安全策略配置',
    path: '/system/config',
    icon: '⚙️',
  },
];

function go(path: string) {
  router.push(path);
}
</script>

<template>
  <Page auto-content-height>
    <div class="space-y-4 p-2">
      <!-- 欢迎卡片 -->
      <Card>
        <div class="flex items-center gap-4">
          <img
            v-if="avatar"
            :src="avatar"
            alt="avatar"
            class="size-14 rounded-full object-cover"
          />
          <div>
            <h2 class="text-xl font-semibold">
              {{ displayName }}
              <span
                v-if="isSuper"
                class="ml-2 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground"
              >
                超级管理员
              </span>
            </h2>
            <p class="mt-1 text-muted-foreground text-sm">
              欢迎回来，开始你的工作吧。
            </p>
          </div>
        </div>
      </Card>

      <!-- 快捷入口 -->
      <div>
        <h3 class="mb-3 font-medium">快捷入口</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            v-for="item in shortcuts"
            :key="item.path"
            class="cursor-pointer transition hover:border-primary"
            @click="go(item.path)"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ item.icon }}</span>
              <div>
                <div class="font-medium">{{ item.title }}</div>
                <div class="text-muted-foreground text-xs">
                  {{ item.desc }}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </Page>
</template>
