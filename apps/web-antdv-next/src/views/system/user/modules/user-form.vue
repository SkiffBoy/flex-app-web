<script lang="ts" setup>
import type { SystemUserApi } from '#/api/system/user';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm, z } from '#/adapter/form';
import { createUserApi, updateUserApi } from '#/api/system/user';

defineOptions({ name: 'UserForm' });

const emits = defineEmits(['success']);

const isEdit = computed(() => !!drawerData.value?.id);
const drawerData = ref<null | SystemUserApi.SysUser>(null);

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
      dependencies: {
        triggerFields: [''],
        disabled: () => isEdit.value,
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'password',
      label: '密码',
      help: isEdit.value ? '编辑时不修改密码请留空' : undefined,
      rules: z
        .string()
        .optional()
        .refine((v) => isEdit.value || (v && v.length > 0), '请输入密码'),
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: '昵称',
    },
    {
      component: 'Input',
      fieldName: 'avatar',
      label: '头像URL',
    },
  ],
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      if (isEdit.value && drawerData.value) {
        // 编辑：只传 nickname/avatar（密码单独走重置）
        await updateUserApi(drawerData.value.id, {
          avatar: values.avatar,
          nickname: values.nickname,
        });
        message.success('已更新');
      } else {
        await createUserApi({
          avatar: values.avatar,
          nickname: values.nickname,
          password: values.password,
          username: values.username,
        });
        message.success('已创建');
      }
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      drawerData.value = drawerApi.getData<SystemUserApi.SysUser>() || null;
      formApi.resetForm();
      if (drawerData.value) {
        formApi.setValues({
          avatar: drawerData.value.avatar ?? '',
          nickname: drawerData.value.nickname ?? '',
          username: drawerData.value.username,
        });
      }
    }
  },
});
</script>

<template>
  <Drawer :title="isEdit ? '编辑用户' : '新增用户'">
    <Form />
  </Drawer>
</template>
