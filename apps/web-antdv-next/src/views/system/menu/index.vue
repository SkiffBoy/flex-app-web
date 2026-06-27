<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemMenuApi } from '#/api/system/menu';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteMenuApi, getMenuListApi } from '#/api/system/menu';

import MenuForm from './modules/menu-form.vue';

defineOptions({ name: 'SystemMenu' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: MenuForm,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'menuName', title: '菜单名称', width: 200, treeNode: true },
      {
        field: 'menuType',
        title: '类型',
        width: 90,
        slots: { default: 'menuType' },
      },
      { field: 'icon', title: '图标', width: 120, slots: { default: 'icon' } },
      { field: 'path', title: '路由路径', width: 180 },
      { field: 'component', title: '组件', width: 180 },
      { field: 'routeName', title: '路由名', width: 140 },
      { field: 'sortOrder', title: '排序', width: 80 },
      { field: 'permissionCode', title: '权限码', width: 140 },
      {
        field: 'action',
        title: '操作',
        width: 200,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async () => {
          const list = await getMenuListApi();
          return { items: list, total: list.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: false, zoom: true },
    treeConfig: {
      parentField: 'parentId',
      rowField: 'id',
      transform: true,
    },
  } as VxeTableGridOptions<SystemMenuApi.SysMenu>,
});

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  formDrawerApi.setData({}).open();
}

function onAppend(row: SystemMenuApi.SysMenu) {
  // 新增子菜单：把当前行 id 作为 parentId 传入
  formDrawerApi.setData({ parentId: row.id }).open();
}

function onEdit(row: SystemMenuApi.SysMenu) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemMenuApi.SysMenu) {
  Modal.confirm({
    content: `确定删除菜单「${row.menuName}」吗？子菜单将一并断开。`,
    onOk: async () => {
      await deleteMenuApi(row.id);
      message.success('已删除');
      onRefresh();
    },
    title: '删除确认',
  });
}

function typeTag(type: string) {
  if (type === 'catalog') return { color: 'blue', text: '目录' };
  if (type === 'menu') return { color: 'green', text: '菜单' };
  if (type === 'embedded') return { color: 'purple', text: '内嵌' };
  if (type === 'link') return { color: 'orange', text: '外链' };
  return { color: 'default', text: type };
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="onRefresh" />
    <Grid table-title="菜单管理">
      <template #toolbar-tools>
        <Button
          v-access:code="'sys.menu.create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          新增菜单
        </Button>
      </template>
      <template #menuType="{ row }">
        <Tag :color="typeTag(row.menuType).color">
          {{ typeTag(row.menuType).text }}
        </Tag>
      </template>
      <template #icon="{ row }">
        <span v-if="row.icon" class="text-sm font-mono">{{ row.icon }}</span>
        <span v-else class="text-muted-foreground">-</span>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            { text: '新增子项', onClick: () => onAppend(row) },
            { text: '编辑', onClick: () => onEdit(row) },
          ]"
          :dropdown-actions="[
            {
              text: '删除',
              danger: true,
              popConfirm: {
                title: `确定删除「${row.menuName}」？`,
                confirm: () => onDelete(row),
              },
            },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
