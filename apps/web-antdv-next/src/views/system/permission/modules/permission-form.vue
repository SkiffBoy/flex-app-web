<script lang="ts" setup>
import type { SystemPermissionApi } from '#/api/system/permission';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import {
  createPermissionApi,
  getPermissionGroupListApi,
  updatePermissionApi,
} from '#/api/system/permission';

defineOptions({ name: 'PermissionForm' });

const emits = defineEmits(['success']);
const drawerData = ref<null | Partial<SystemPermissionApi.SysPermission>>(null);
const isEdit = computed(() => !!drawerData.value?.id);
const groupOptions = ref<{ label: string; value: string }[]>([]);

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Select',
      fieldName: 'groupCode',
      label: '所属组',
      rules: 'required',
      componentProps: { options: groupOptions },
    },
    {
      component: 'Input',
      fieldName: 'permissionCode',
      label: '权限码',
      help: '点分三段：模块.资源.操作',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'permissionName',
      label: '权限名称',
      rules: 'required',
    },
    {
      component: 'Textarea',
      fieldName: 'description',
      label: '描述',
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
      const payload: Partial<SystemPermissionApi.SysPermission> = {
        description: values.description || null,
        enabled: 1,
        groupCode: values.groupCode,
        permissionCode: values.permissionCode,
        permissionName: values.permissionName,
      };
      if (isEdit.value && drawerData.value?.id) {
        await updatePermissionApi(drawerData.value.id, payload);
        message.success('已更新');
      } else {
        await createPermissionApi(payload);
        message.success('已创建');
      }
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      drawerData.value =
        drawerApi.getData<Partial<SystemPermissionApi.SysPermission>>();
      formApi.resetForm();
      const list = await getPermissionGroupListApi();
      groupOptions.value = list.map((g) => ({
        label: `${g.groupName}（${g.groupCode}）`,
        value: g.groupCode,
      }));
      if (drawerData.value) {
        formApi.setValues({
          description: drawerData.value.description ?? '',
          groupCode: drawerData.value.groupCode ?? '',
          permissionCode: drawerData.value.permissionCode ?? '',
          permissionName: drawerData.value.permissionName ?? '',
        });
      }
    }
  },
});
</script>

<template>
  <Drawer :title="isEdit ? '编辑权限' : '新增权限'">
    <Form />
  </Drawer>
</template>
