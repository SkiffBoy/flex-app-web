<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api/system/user';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteUserApi,
  getUserListApi,
  setUserEnabledApi,
  setUserStatusApi,
  unlockUserApi,
} from '#/api/system/user';

import GrantDrawer from './modules/grant-drawer.vue';
import PasswordForm from './modules/password-form.vue';
import UserForm from './modules/user-form.vue';

defineOptions({ name: 'SystemUser' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: UserForm,
  destroyOnClose: true,
});
const [PasswordDrawer, passwordDrawerApi] = useVbenDrawer({
  connectedComponent: PasswordForm,
  destroyOnClose: true,
});
const [GrantDrawerComp, grantDrawerApi] = useVbenDrawer({
  connectedComponent: GrantDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'id', title: 'ID', width: 90 },
      { field: 'username', title: '用户名', width: 140 },
      { field: 'nickname', title: '昵称', width: 140 },
      {
        field: 'accountStatus',
        title: '状态',
        width: 100,
        slots: { default: 'accountStatus' },
      },
      {
        field: 'enabled',
        title: '启用',
        width: 80,
        slots: { default: 'enabled' },
      },
      {
        field: 'locked',
        title: '锁定',
        width: 80,
        slots: { default: 'locked' },
      },
      { field: 'failedLoginCount', title: '失败次数', width: 90 },
      { field: 'createdAt', title: '创建时间', width: 170 },
      {
        field: 'action',
        title: '操作',
        width: 240,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          const data = await getUserListApi({
            page: page.currentPage,
            size: page.pageSize,
          });
          // adapter proxyConfig.response.result='items'，故返回 {items, total}
          return { items: data.rows, total: data.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: false, zoom: true },
  } as VxeTableGridOptions<SystemUserApi.SysUser>,
});

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  formDrawerApi.setData({}).open();
}

function onEdit(row: SystemUserApi.SysUser) {
  formDrawerApi.setData(row).open();
}

function onResetPassword(row: SystemUserApi.SysUser) {
  passwordDrawerApi.setData(row).open();
}

function onGrant(row: SystemUserApi.SysUser) {
  grantDrawerApi.setData(row).open();
}

function onDelete(row: SystemUserApi.SysUser) {
  Modal.confirm({
    title: '删除确认',
    content: `确定删除用户「${row.username}」吗？`,
    onOk: async () => {
      await deleteUserApi(row.id);
      message.success('已删除');
      onRefresh();
    },
  });
}

async function onToggleEnabled(row: SystemUserApi.SysUser) {
  const next = row.enabled === 1 ? 0 : 1;
  await setUserEnabledApi(row.id, next);
  message.success(next === 1 ? '已启用' : '已禁用');
  onRefresh();
}

async function onFreeze(row: SystemUserApi.SysUser) {
  await setUserStatusApi(row.id, 'FROZEN');
  message.success('已冻结');
  onRefresh();
}

async function onUnfreeze(row: SystemUserApi.SysUser) {
  await setUserStatusApi(row.id, 'NORMAL');
  message.success('已解冻');
  onRefresh();
}

async function onUnlock(row: SystemUserApi.SysUser) {
  await unlockUserApi(row.id);
  message.success('已解锁');
  onRefresh();
}

function statusTag(status: string) {
  if (status === 'NORMAL') return { color: 'green', text: '正常' };
  if (status === 'FROZEN') return { color: 'blue', text: '冻结' };
  if (status === 'BANNED') return { color: 'red', text: '封禁' };
  return { color: 'default', text: status };
}

/** 构造下拉操作（条件项按行状态动态生成，避免 null 污染类型）。 */
function buildDropdownActions(row: SystemUserApi.SysUser) {
  return [
    { text: '重置密码', onClick: () => onResetPassword(row) },
    row.enabled === 1
      ? { text: '禁用', onClick: () => onToggleEnabled(row) }
      : { text: '启用', onClick: () => onToggleEnabled(row) },
    row.accountStatus === 'FROZEN'
      ? { text: '解冻', onClick: () => onUnfreeze(row) }
      : { text: '冻结', onClick: () => onFreeze(row) },
    ...(row.locked === 1
      ? [{ text: '解锁', onClick: () => onUnlock(row) }]
      : []),
    {
      danger: true,
      popConfirm: {
        confirm: () => onDelete(row),
        title: `确定删除「${row.username}」？`,
      },
      text: '删除',
    },
  ];
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="onRefresh" />
    <PasswordDrawer @success="onRefresh" />
    <GrantDrawerComp @success="onRefresh" />
    <Grid table-title="用户管理">
      <template #toolbar-tools>
        <Button
          v-access:code="'sys.user.create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          新增用户
        </Button>
      </template>
      <template #accountStatus="{ row }">
        <Tag :color="statusTag(row.accountStatus).color">
          {{ statusTag(row.accountStatus).text }}
        </Tag>
      </template>
      <template #enabled="{ row }">
        <Tag :color="row.enabled === 1 ? 'green' : 'default'">
          {{ row.enabled === 1 ? '是' : '否' }}
        </Tag>
      </template>
      <template #locked="{ row }">
        <Tag :color="row.locked === 1 ? 'red' : 'default'">
          {{ row.locked === 1 ? '锁定' : '正常' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            { text: '编辑', onClick: () => onEdit(row) },
            { text: '授权', onClick: () => onGrant(row) },
          ]"
          :dropdown-actions="buildDropdownActions(row)"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
