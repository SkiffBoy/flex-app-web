<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SysAuditLog } from '#/api/system/audit';

import { computed, ref } from 'vue';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';

import {
  Button,
  DateRangePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAuditLogListApi } from '#/api/system/audit';

import DetailDrawer from './modules/detail-drawer.vue';

defineOptions({ name: 'SystemAudit' });

// 查询条件（后端要求至少一项）
const queryForm = ref({
  action: undefined as string | undefined,
  endTime: undefined as string | undefined,
  module: undefined as string | undefined,
  operatorId: undefined as number | undefined,
  startTime: undefined as string | undefined,
  traceId: undefined as string | undefined,
});

const hasFilter = computed(
  () =>
    !!queryForm.value.module ||
    !!queryForm.value.action ||
    queryForm.value.operatorId != null ||
    !!queryForm.value.traceId ||
    !!queryForm.value.startTime,
);

const [DetailDrawerComp, detailDrawerApi] = useVbenDrawer({
  connectedComponent: DetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'traceId', title: 'TraceID', width: 180 },
      { field: 'module', title: '模块', width: 120 },
      { field: 'action', title: '操作', width: 120 },
      { field: 'operatorId', title: '操作人', width: 90 },
      { field: 'targetType', title: '目标类型', width: 110 },
      { field: 'targetName', title: '目标名', minWidth: 140 },
      { field: 'clientIp', title: 'IP', width: 140 },
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
    proxyConfig: {
      enabled: false, // 手动触发查询（强制条件）
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: false, search: false, zoom: true },
  } as VxeTableGridOptions<SysAuditLog>,
});

async function onSearch() {
  if (!hasFilter.value) {
    message.warning('请至少填写一个查询条件（后端要求窄范围，避免全表扫描）');
    return;
  }
  const data = await getAuditLogListApi({
    action: queryForm.value.action,
    endTime: queryForm.value.endTime,
    module: queryForm.value.module,
    operatorId: queryForm.value.operatorId,
    page: 1,
    size: 20,
    startTime: queryForm.value.startTime,
    traceId: queryForm.value.traceId,
  });
  // 手动装载（proxyConfig disabled）：用原生 vxe grid 实例 loadData
  gridApi.grid.loadData(data.rows);
}

function onDetail(row: SysAuditLog) {
  detailDrawerApi.setData(row).open();
}

function onRangeChange(_value: unknown, [start, end]: string[]) {
  queryForm.value.startTime = start ? `${start} 00:00:00` : undefined;
  queryForm.value.endTime = end ? `${end} 23:59:59` : undefined;
}
</script>

<template>
  <Page auto-content-height>
    <DetailDrawerComp />
    <div class="mb-3">
      <Form layout="inline">
        <FormItem label="模块">
          <Input
            v-model:value="queryForm.module"
            allow-clear
            placeholder="如 USER"
          />
        </FormItem>
        <FormItem label="操作">
          <Input
            v-model:value="queryForm.action"
            allow-clear
            placeholder="如 CREATE"
          />
        </FormItem>
        <FormItem label="操作人ID">
          <InputNumber v-model:value="queryForm.operatorId" />
        </FormItem>
        <FormItem label="TraceID">
          <Input v-model:value="queryForm.traceId" allow-clear />
        </FormItem>
        <FormItem label="时间范围">
          <DateRangePicker @change="onRangeChange" />
        </FormItem>
        <FormItem>
          <Button type="primary" :disabled="!hasFilter" @click="onSearch">
            查询
          </Button>
        </FormItem>
      </Form>
    </div>
    <Grid table-title="审计日志">
      <template #action="{ row }">
        <VbenTableAction
          :actions="[{ text: '详情', onClick: () => onDetail(row) }]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
