<script lang="ts" setup>
/**
 * 图片验证码组件（替换 Vben 内置 SliderCaptcha）。
 *
 * 后端契约：GET /api/auth/captcha → { captchaKey, imageBase64 }
 * 其中 imageBase64 为 data:image/png;base64,... 直接渲染。
 * 登录时回传 captchaCode（用户输入）+ captchaKey（组件维护）。
 *
 * 大小写不敏感由后端 equalsIgnoreCase 处理，前端不转换。
 */
import { onMounted, ref } from 'vue';

import { RotateCw } from '@vben/icons';

import { requestClient } from '#/api/request';

interface Props {
  /** 输入框占位符。 */
  placeholder?: string;
  /** 图片高度（px），宽度自适应容器。 */
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 40,
  placeholder: '请输入验证码',
});

const emit = defineEmits<{
  /** 验证码 key 变化（每次刷新/首屏生成）。父组件需收集用于登录回传。 */
  keyChange: [key: string];
}>();

const code = defineModel<string>({ default: '' });

const captchaKey = ref('');
const imageBase64 = ref('');
const loading = ref(false);

async function refresh() {
  loading.value = true;
  try {
    const data = await requestClient.get<{
      captchaKey: string;
      imageBase64: string;
    }>('/auth/captcha');
    captchaKey.value = data.captchaKey;
    imageBase64.value = data.imageBase64;
    emit('keyChange', captchaKey.value);
    // 刷新后清空已输入的 code（旧 code 对新图无意义）
    code.value = '';
  } catch {
    // 网络错误等：保持空图，用户可点重试。具体提示由全局响应拦截器处理。
    imageBase64.value = '';
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

defineExpose({ refresh, captchaKey });
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      v-model="code"
      :placeholder="placeholder"
      :style="{ height: `${props.height}px` }"
      autocomplete="off"
      class="flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
      type="text"
    />
    <div
      class="flex h-full cursor-pointer items-center overflow-hidden rounded-md border border-border bg-muted transition hover:border-primary"
      :style="{ height: `${props.height}px`, minWidth: '110px' }"
      :title="loading ? '加载中...' : '点击刷新验证码'"
      @click="refresh"
    >
      <img
        v-if="imageBase64"
        :src="imageBase64"
        alt="验证码"
        class="h-full w-full object-cover"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-muted-foreground"
      >
        <RotateCw class="size-4 animate-spin" />
      </div>
    </div>
  </div>
</template>
