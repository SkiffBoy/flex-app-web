<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SessionVo } from '#/api/system/session';

import { Page, VbenTableAction } from '@vben/common-ui';

import { message, Modal, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getAdminSessionListApi,
  kickoutSessionApi,
  kickoutUserSessionsApi,
} from '#/api/system/session';

defineOptions({ name: 'SystemSession' });

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'sessionId', title: '会话ID', width: 200 },
      { field: 'userId', title: '用户ID', width: 90 },
      { field: 'deviceType', title: '设备', width: 100 },
      { field: 'browser', title: '浏览器', width: 120 },
      { field: 'os', title: '系统', width: 120 },
      { field: 'clientIp', title: 'IP', width: 140 },
      {
        field: 'status',
        title: '状态',
        width: 100,
        slots: { default: 'status' },
      },
      { field: 'loginAt', title: '登录时间', width: 170 },
      { field: 'lastActiveAt', title: '最后活跃', width: 170 },
      {
        field: 'action',
        title: '操作',
        width: 180,
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
          const data = await getAdminSessionListApi({
            page: page.currentPage,
            size: page.pageSize,
          });
          return { items: data.rows, total: data.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: false, zoom: true },
  } as VxeTableGridOptions<SessionVo>,
});

function onRefresh() {
  gridApi.query();
}

async function onKickout(row: SessionVo) {
  await kickoutSessionApi(row.sessionId);
  message.success('已踢出');
  onRefresh();
}

function onKickoutUser(row: SessionVo) {
  Modal.confirm({
    title: '踢出确认',
    content: `确定踢出用户 ${row.userId} 的全部在线会话吗？`,
    onOk: async () => {
      await kickoutUserSessionsApi(row.userId);
      message.success('已踢出该用户全部会话');
      onRefresh();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="在线会话">
      <template #status="{ row }">
        <Tag :color="row.status === 'ONLINE' ? 'green' : 'default'">
          {{ row.status }}
        </Tag>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              text: '踢出',
              popConfirm: {
                confirm: () => onKickout(row),
                title: `确定踢出会话「${row.sessionId}」？`,
              },
            },
            { text: '踢出用户', onClick: () => onKickoutUser(row) },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
