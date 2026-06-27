<script lang="ts" setup>
import type { SystemMenuApi } from '#/api/system/menu';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm, z } from '#/adapter/form';
import {
  createMenuApi,
  getMenuListApi,
  updateMenuApi,
} from '#/api/system/menu';

defineOptions({ name: 'MenuForm' });

const emits = defineEmits(['success']);
const drawerData = ref<null | Partial<SystemMenuApi.SysMenu>>(null);
const isEdit = computed(() => !!drawerData.value?.id);
const menuOptions = ref<{ label: string; value: number }[]>([]);

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Select',
      fieldName: 'parentId',
      label: '上级菜单',
      help: '留空为顶级',
      componentProps: { allowClear: true, options: menuOptions },
    },
    {
      component: 'Select',
      fieldName: 'menuType',
      label: '类型',
      defaultValue: 'menu',
      rules: 'required',
      componentProps: {
        options: [
          { label: '目录', value: 'catalog' },
          { label: '菜单', value: 'menu' },
          { label: '内嵌', value: 'embedded' },
          { label: '外链', value: 'link' },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'menuName',
      label: '菜单名称',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'routeName',
      label: '路由名',
      help: 'Vben route name（必填，唯一）',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'path',
      label: '路由路径',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'component',
      label: '组件',
      help: '如 system/user/index（匹配 views 下 .vue）',
    },
    {
      component: 'Input',
      fieldName: 'icon',
      label: '图标',
      help: 'lucide:xxx 图标名',
    },
    {
      component: 'Input',
      fieldName: 'redirect',
      label: '重定向',
      help: '目录类型可选',
    },
    {
      component: 'Input',
      fieldName: 'permissionCode',
      label: '权限码',
    },
    {
      component: 'InputNumber',
      fieldName: 'sortOrder',
      label: '排序',
      defaultValue: 0,
      rules: z.number().int().min(0).optional(),
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
      // 构造实体（meta 简单存 title）
      const payload: Partial<SystemMenuApi.SysMenu> = {
        component: values.component || null,
        enabled: 1,
        icon: values.icon || null,
        menuName: values.menuName,
        menuType: values.menuType,
        parentId: values.parentId ?? null,
        path: values.path,
        permissionCode: values.permissionCode || null,
        redirect: values.redirect || null,
        routeName: values.routeName,
        sortOrder: values.sortOrder ?? 0,
        visible: 1,
      };
      if (isEdit.value && drawerData.value?.id) {
        await updateMenuApi(drawerData.value.id, payload);
        message.success('已更新');
      } else {
        await createMenuApi(payload);
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
      drawerData.value = drawerApi.getData<Partial<SystemMenuApi.SysMenu>>();
      formApi.resetForm();
      // 加载菜单列表供上级选择
      const list = await getMenuListApi();
      menuOptions.value = list.map((m) => ({
        label: `${m.menuName}（${m.path ?? ''}）`,
        value: m.id,
      }));
      if (drawerData.value) {
        formApi.setValues({
          component: drawerData.value.component ?? '',
          icon: drawerData.value.icon ?? '',
          menuName: drawerData.value.menuName ?? '',
          menuType: drawerData.value.menuType ?? 'menu',
          parentId: drawerData.value.parentId ?? undefined,
          path: drawerData.value.path ?? '',
          permissionCode: drawerData.value.permissionCode ?? '',
          redirect: drawerData.value.redirect ?? '',
          routeName: drawerData.value.routeName ?? '',
          sortOrder: drawerData.value.sortOrder ?? 0,
        });
      }
    }
  },
});
</script>

<template>
  <Drawer :title="isEdit ? '编辑菜单' : '新增菜单'">
    <Form />
  </Drawer>
</template>
