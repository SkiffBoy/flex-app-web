<script setup lang="ts">
import { onMounted } from 'vue';

import { reportError } from '@flex/shared';
import { message } from 'antdv-next';

import { getDemoHello } from '../api/demo';
import { useDemoStore } from '../store/demo';

const store = useDemoStore();

async function load() {
  store.setLoading(true);
  try {
    const { msg } = await getDemoHello();
    store.setMsg(msg);
  } catch (error) {
    reportError(error as Error, 'plugin-demo');
    message.error('加载失败');
  } finally {
    store.setLoading(false);
  }
}

onMounted(load);
</script>

<template>
  <div class="plugin-demo-home">
    <h2>Plugin Demo（前端插件化验证）</h2>
    <a-card :loading="store.loading">
      <p>后端 /demo/hello 返回：{{ store.msg || '（加载中）' }}</p>
      <p>
        验证项：vue 单例 ✓ / antdv-next 组件 ✓ / Pinia store 隔离 ✓ / Token 继承
        ✓
      </p>
      <router-link to="/demo/fail">前往故障演示页 →</router-link>
    </a-card>
  </div>
</template>

<style scoped>
.plugin-demo-home {
  padding: 16px;
}
</style>
