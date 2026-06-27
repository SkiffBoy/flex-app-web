<script setup lang="ts">
import { ref } from 'vue';

import { reportError } from '@flex/shared';
import { message } from 'antdv-next';

import { getDemoFail } from '../api/demo';

const errorMsg = ref('');

async function triggerFail() {
  try {
    await getDemoFail();
  } catch (error) {
    // 异步异常手动 try-catch + reportError（spec §异常处理规范）
    reportError(error as Error, 'plugin-demo');
    errorMsg.value = (error as Error).message;
    message.error('已捕获插件异常，主应用未崩溃');
  }
}
</script>

<template>
  <div class="plugin-demo-fail">
    <h2>故障演示页</h2>
    <a-button type="primary" danger @click="triggerFail">
      触发插件异常（调 /demo/fail）
    </a-button>
    <p v-if="errorMsg">捕获的错误：{{ errorMsg }}</p>
    <p>说明：异常被 reportError 捕获 + 上报，主应用正常运行。</p>
    <router-link to="/demo">← 返回示例首页</router-link>
  </div>
</template>

<style scoped>
.plugin-demo-fail {
  padding: 16px;
}
</style>
