<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Empty, Statistic, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getLoginLogListApi, getLoginLogStatsApi } from '#/api/system/login-log';

defineOptions({ name: 'SystemLoginLog' });

const successCount = ref(0);
const failedCount = ref(0);

async function loadStats() {
  const stats = await getLoginLogStatsApi();
  // 按 event 分组：LOGIN_SUCCESS / LOGIN_FAIL 等
  successCount.value = stats
    .filter((s) => s.event.includes('SUCCESS'))
    .reduce((sum, s) => sum + s.count, 0);
  failedCount.value = stats
    .filter((s) => s.event.includes('FAIL'))
    .reduce((sum, s) => sum + s.count, 0);
}

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'id', title: 'ID', width: 90 },
      { field: 'userId', title: '用户ID', width: 90 },
      { field: 'username', title: '用户名', width: 140 },
      {
        field: 'event',
        title: '事件',
        width: 140,
        slots: { default: 'event' },
      },
      { field: 'clientIp', title: 'IP', width: 140 },
      { field: 'deviceType', title: '设备', width: 100 },
      { field: 'browser', title: '浏览器', width: 120 },
      {
        field: 'success',
        title: '结果',
        width: 90,
        slots: { default: 'success' },
      },
      { field: 'errorMessage', title: '错误信息', minWidth: 160 },
      { field: 'createdAt', title: '时间', width: 170 },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          const data = await getLoginLogListApi({
            page: page.currentPage,
            size: page.pageSize,
          });
          return { items: data.rows, total: data.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: false, zoom: true },
  } as VxeTableGridOptions,
});

onMounted(loadStats);
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex gap-4">
      <Card class="min-w-[180px]">
        <Statistic title="登录成功" :value="successCount" />
      </Card>
      <Card class="min-w-[180px]">
        <Statistic
          title="登录失败"
          :value="failedCount"
          :value-style="{ color: '#cf1322' }"
        />
      </Card>
      <!-- TODO(P2): 趋势折线图待后端补 /admin/login-logs/stats trend 端点（当前仅 event 计数） -->
      <Card class="flex-1">
        <Empty :image="undefined" description="登录趋势图待后端补 trend 端点" />
      </Card>
    </div>
    <Grid table-title="登录日志">
      <template #event="{ row }">
        <Tag>{{ row.event }}</Tag>
      </template>
      <template #success="{ row }">
        <Tag :color="row.success === 1 ? 'green' : 'red'">
          {{ row.success === 1 ? '成功' : '失败' }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>
