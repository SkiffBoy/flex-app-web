<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, markRaw, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

import CaptchaImage from './captcha-image.vue';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

/**
 * 当前验证码 key（后端生成，登录时回传）。
 * 由 CaptchaImage 组件通过 onKeyChange 回调写入；提交时随表单一并发送。
 */
const captchaKey = ref('');

/**
 * 提交处理：把表单值（username/password/captchaCode）+ captchaKey 合并发给 authStore。
 */
async function handleSubmit(values: Record<string, any>) {
  await authStore.authLogin({
    captchaCode: values?.captchaCode,
    captchaKey: captchaKey.value,
    password: values?.password,
    username: values?.username,
  });
}

const formSchema = computed((): VbenFormSchema[] => {
  const schema: VbenFormSchema[] = [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: markRaw(CaptchaImage),
      // 图片验证码：自定义组件，绑定 captchaCode（defineModel），
      // 并通过 componentProps.onKeyChange 回收后端生成的 captchaKey。
      componentProps: {
        placeholder: '请输入验证码',
        onKeyChange: (key: string) => {
          captchaKey.value = key;
        },
      },
      fieldName: 'captchaCode',
      label: '验证码',
      rules: z.string().min(1, { message: '请输入验证码' }).default(''),
    },
  ];

  return schema;
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="handleSubmit"
  />
</template>
