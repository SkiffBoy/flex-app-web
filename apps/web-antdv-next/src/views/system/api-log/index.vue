<script lang="ts" setup>
import type { ApiLogCategory, ApiLogQueryResult } from '#/api/system/api-log';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';

import {
  DateRangePicker,
  Form,
  FormItem,
  Input,
  message,
  Select,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getApiLogCategoriesApi, queryApiLogApi } from '#/api/system/api-log';

import ChainDrawer from './modules/chain-drawer.vue';

defineOptions({ name: 'SystemApiLog' });

const categories = ref<ApiLogCategory[]>([]);
const queryForm = ref({
  category: undefined as string | undefined,
  endTime: '' as string,
  startTime: '' as string,
  traceId: undefined as string | undefined,
});

const [ChainDrawerComp, chainDrawerApi] = useVbenDrawer({
  connectedComponent: ChainDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'traceId', title: 'TraceID', width: 180 },
      { field: 'spanId', title: 'SpanID', width: 120 },
      {
        field: 'status',
        title: '状态码',
        width: 90,
        slots: { default: 'status' },
      },
      { field: 'method', title: '方法', width: 80 },
      { field: 'path', title: '路径', minWidth: 180 },
      { field: 'durationMs', title: '耗时(ms)', width: 100 },
      { field: 'category', title: '分类', width: 100 },
      { field: 'clientIp', title: 'IP', width: 130 },
      { field: 'userId', title: '用户', width: 90 },
      { field: 'createdAt', title: '时间', width: 170 },
      {
        field: 'action-col',
        title: '操作',
        width: 100,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 20 },
    proxyConfig: { enabled: false },
    rowConfig: { keyField: 'id' },
    rowClassName: ({ row }: { row: ApiLogQueryResult }) =>
      row.status >= 400 ? 'row-error' : '',
    toolbarConfig: { custom: true, refresh: false, zoom: true },
  } as any,
});

async function onSearch() {
  if (!queryForm.value.startTime || !queryForm.value.endTime) {
    message.warning('请选择时间范围（后端要求必填，≤30天）');
    return;
  }
  const data = await queryApiLogApi({
    category: queryForm.value.category,
    pageNo: 1,
    pageSize: 20,
    timeFrom: queryForm.value.startTime,
    timeTo: queryForm.value.endTime,
    traceId: queryForm.value.traceId,
  });
  gridApi.grid.loadData(data.rows);
}

function onChain(row: ApiLogQueryResult) {
  chainDrawerApi.setData(row.traceId).open();
}

function onRangeChange(_value: unknown, [start, end]: string[]) {
  queryForm.value.startTime = start ? `${start} 00:00:00` : '';
  queryForm.value.endTime = end ? `${end} 23:59:59` : '';
}

onMounted(async () => {
  categories.value = await getApiLogCategoriesApi();
});
</script>

<template>
  <Page auto-content-height>
    <ChainDrawerComp />
    <div class="mb-3">
      <Form layout="inline">
        <FormItem label="时间范围">
          <DateRangePicker @change="onRangeChange" />
        </FormItem>
        <FormItem label="分类">
          <Select
            v-model:value="queryForm.category"
            :options="categories.map((c) => ({ label: c.label, value: c.value }))"
            allow-clear
            style="width: 140px"
          />
        </FormItem>
        <FormItem label="TraceID">
          <Input v-model:value="queryForm.traceId" allow-clear />
        </FormItem>
        <FormItem>
          <a-button type="primary" @click="onSearch">查询</a-button>
        </FormItem>
      </Form>
    </div>
    <Grid table-title="API 日志">
      <template #status="{ row }">
        <span :style="{ color: row.status >= 400 ? '#cf1322' : '' }">
          {{ row.status }}
        </span>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            { text: '链路', onClick: () => onChain(row as ApiLogQueryResult) },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
:deep(.row-error) {
  background-color: #fff1f0;
}
</style>
