<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { NotificationVo } from '#/api/user/notification';

import { onMounted, onUnmounted, ref } from 'vue';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';
import { Bell } from '@vben/icons';

import { Badge, Button, message, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteNotificationApi,
  getNotificationListApi,
  getUnreadCountApi,
  markAllReadApi,
  markReadApi,
} from '#/api/user/notification';
import { useSSE } from '#/composables/use-sse';

import PreferenceDrawer from './modules/preference-drawer.vue';

defineOptions({ name: 'NotificationCenter' });

const unreadCount = ref(0);
const { on: onSse } = useSSE();

const [PreferenceDrawerComp, preferenceDrawerApi] = useVbenDrawer({
  connectedComponent: PreferenceDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      {
        field: 'title',
        title: '标题',
        minWidth: 200,
        slots: { default: 'titleCell' },
      },
      { field: 'category', title: '分类', width: 120 },
      {
        field: 'priority',
        title: '优先级',
        width: 100,
        slots: { default: 'priority' },
      },
      {
        field: 'isRead',
        title: '状态',
        width: 90,
        slots: { default: 'isRead' },
      },
      { field: 'createdAt', title: '时间', width: 170 },
      {
        field: 'action',
        title: '操作',
        width: 160,
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
          const data = await getNotificationListApi({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
          });
          return { items: data.rows, total: data.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<NotificationVo>,
});

function onRefresh() {
  gridApi.query();
  loadUnread();
}

async function loadUnread() {
  unreadCount.value = await getUnreadCountApi();
}

async function onMarkRead(row: NotificationVo) {
  await markReadApi(row.id);
  message.success('已标记已读');
  onRefresh();
}

async function onMarkAllRead() {
  await markAllReadApi();
  message.success('已全部标记已读');
  onRefresh();
}

function onDelete(row: NotificationVo) {
  deleteNotificationApi(row.id).then(() => {
    message.success('已删除');
    onRefresh();
  });
}

// SSE：收到新通知 → 刷新列表 + 角标 +1
let unsub: (() => void) | undefined;

onMounted(() => {
  loadUnread();
  unsub = onSse('notification.new', () => {
    onRefresh();
  });
});

onUnmounted(() => {
  unsub?.();
});
</script>

<template>
  <Page auto-content-height>
    <PreferenceDrawerComp />
    <Grid table-title="通知中心">
      <template #toolbar-tools>
        <Badge :count="unreadCount" :offset="[-4, 4]">
          <Bell class="size-5" />
        </Badge>
        <Button class="ml-2" @click="onMarkAllRead">全部已读</Button>
        <Button class="ml-2" @click="preferenceDrawerApi.open()">
          偏好设置
        </Button>
      </template>
      <template #titleCell="{ row }">
        <span :class="{ 'font-bold': row.isRead === 0 }">{{ row.title }}</span>
      </template>
      <template #priority="{ row }">
        <Tag
          :color="
            row.priority === 'HIGH'
              ? 'red'
              : row.priority === 'MEDIUM'
                ? 'orange'
                : 'default'
          "
        >
          {{ row.priority }}
        </Tag>
      </template>
      <template #isRead="{ row }">
        <Tag :color="row.isRead === 1 ? 'default' : 'blue'">
          {{ row.isRead === 1 ? '已读' : '未读' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            ...(row.isRead === 0
              ? [{ text: '标为已读', onClick: () => onMarkRead(row) }]
              : []),
            {
              danger: true,
              popConfirm: {
                confirm: () => onDelete(row),
                title: '确定删除？',
              },
              text: '删除',
            },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
