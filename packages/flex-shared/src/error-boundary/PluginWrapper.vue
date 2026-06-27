<script setup lang="ts">
/**
 * 插件错误边界：onErrorCaptured return false 阻止冒泡到主应用（spec §异常隔离）。
 * 主 Shell 渲染插件组件时包一层。
 */
import { onErrorCaptured } from 'vue';

import { reportError } from '../error-reporter';

const props = defineProps<{ pluginId: string }>();

onErrorCaptured((err) => {
  reportError(err as Error, props.pluginId);
  return false; // 阻止冒泡到主应用
});
</script>

<template>
  <slot></slot>
</template>
