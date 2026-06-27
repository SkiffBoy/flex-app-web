<script lang="ts" setup>
import type { SystemUserApi } from '#/api/system/user';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { resetUserPasswordApi } from '#/api/system/user';

defineOptions({ name: 'PasswordForm' });

const emits = defineEmits(['success']);
let userId = 0;

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'InputPassword',
      fieldName: 'password',
      label: '新密码',
      rules: 'required',
      help: '需满足安全策略（大小写/数字/特殊字符）',
    },
    {
      component: 'InputPassword',
      fieldName: 'confirm',
      label: '确认新密码',
      rules: 'required',
    },
  ],
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    if (values.password !== values.confirm) {
      message.error('两次输入不一致');
      return;
    }
    drawerApi.lock();
    try {
      await resetUserPasswordApi(userId, values.password);
      message.success('密码已重置');
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<SystemUserApi.SysUser>();
      userId = data?.id ?? 0;
      formApi.resetForm();
    }
  },
});
</script>

<template>
  <Drawer title="重置密码">
    <Form />
  </Drawer>
</template>
