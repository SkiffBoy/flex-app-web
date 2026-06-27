<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, ref } from 'vue';

import { AuthenticationForgetPassword, z } from '@vben/common-ui';

import { message } from 'antdv-next';

import { changePasswordApi } from '#/api';
import { useAuthStore } from '#/store';

defineOptions({ name: 'ChangePassword' });

const authStore = useAuthStore();
const loading = ref(false);
const formSchema = computed((): VbenFormSchema[] => [
  {
    component: 'VbenInputPassword',
    componentProps: { placeholder: '请输入旧密码' },
    fieldName: 'oldPassword',
    label: '旧密码',
    rules: z.string().min(1, { message: '请输入旧密码' }),
  },
  {
    component: 'VbenInputPassword',
    componentProps: { placeholder: '请输入新密码' },
    fieldName: 'newPassword',
    label: '新密码',
    rules: z.string().min(1, { message: '请输入新密码' }),
    help: '需满足安全策略（大小写/数字/特殊字符），以服务端校验为准',
  },
  {
    component: 'VbenInputPassword',
    componentProps: { placeholder: '请再次输入新密码' },
    fieldName: 'confirmPassword',
    label: '确认新密码',
    rules: z.string().min(1, { message: '请再次输入新密码' }),
  },
]);

async function handleSubmit(values: Record<string, any>) {
  if (values.newPassword !== values.confirmPassword) {
    message.error('两次输入的新密码不一致');
    return;
  }
  loading.value = true;
  try {
    await changePasswordApi({
      newPassword: values.newPassword,
      oldPassword: values.oldPassword,
    });
    message.success('密码修改成功，请重新登录');
    authStore.setPasswordExpired(false);
    await authStore.logout(true);
  } catch {
    // 错误提示由全局响应拦截器处理
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationForgetPassword
    :form-schema="formSchema"
    :loading="loading"
    submit-button-text="修改密码"
    sub-title="您的密码已过期，请修改后继续使用"
    title="修改密码"
    @submit="handleSubmit"
  >
    <template #submitButtonText>修改密码</template>
  </AuthenticationForgetPassword>
</template>
