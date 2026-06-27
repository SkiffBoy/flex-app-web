<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ChainStatus, FlowInstance } from '#/api/workflow/execution';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Input, message, Select, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listExecutionApi, resumeExecutionApi } from '#/api/workflow/execution';

defineOptions({ name: 'WorkflowMonitor' });

const router = useRouter();

const STATUS_OPTIONS: { label: string; value: ChainStatus }[] = [
  { label: '执行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCEEDED' },
  { label: '失败', value: 'FAILED' },
  { label: '挂起', value: 'SUSPEND' },
  { label: '就绪', value: 'READY' },
  { label: '已取消', value: 'CANCELLED' },
];

const statusColor: Record<ChainStatus, string> = {
  CANCELLED: 'default',
  ERROR: 'red',
  FAILED: 'red',
  READY: 'default',
  RUNNING: 'blue',
  SUSPEND: 'orange',
  SUCCEEDED: 'green',
};

const filterStatus = ref<ChainStatus | undefined>();
const filterDefinitionId = ref('');

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'instanceId', minWidth: 200, title: '实例ID' },
      { field: 'definitionId', minWidth: 160, title: '工作流' },
      {
        field: 'status',
        slots: { default: 'status' },
        title: '状态',
        width: 100,
      },
      { field: 'triggerType', title: '触发方式', width: 110 },
      {
        field: 'startedAt',
        slots: { default: 'startedAt' },
        title: '开始时间',
        width: 180,
      },
      {
        field: 'computeCost',
        slots: { default: 'computeCost' },
        title: '耗时',
        width: 110,
      },
      {
        field: 'action',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 200,
      },
    ],
    height: 'auto',
    proxyConfig: { enabled: false },
    rowConfig: { keyField: 'instanceId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<FlowInstance>,
});

async function onSearch() {
  const rows = await listExecutionApi({
    definitionId: filterDefinitionId.value || undefined,
    status: filterStatus.value,
  });
  gridApi.grid?.loadData(rows);
}

function onView(row: FlowInstance) {
  router.push(`/workflow/monitor/${row.instanceId}`);
}

function onResume(row: FlowInstance) {
  resumeExecutionApi(row.instanceId).then(() => {
    message.success('已恢复');
    onSearch();
  });
}

function formatTime(v: null | string) {
  return v ?? '-';
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="运行实例">
      <template #toolbar-tools>
        <Select
          v-model:value="filterStatus"
          :options="STATUS_OPTIONS"
          allow-clear
          placeholder="状态"
          style="width: 140px"
        />
        <Input
          v-model:value="filterDefinitionId"
          allow-clear
          placeholder="工作流ID"
          style="width: 200px; margin: 0 8px"
        />
        <Button type="primary" @click="onSearch">查询</Button>
      </template>
      <template #status="{ row }">
        <Tag :color="statusColor[row.status as ChainStatus]">{{ row.status }}</Tag>
      </template>
      <template #startedAt="{ row }">{{ formatTime(row.startedAt) }}</template>
      <template #computeCost="{ row }">
        {{ row.computeCost != null ? `${row.computeCost}ms` : '-' }}
      </template>
      <template #action="{ row }">
        <Button size="small" @click="onView(row)">查看</Button>
        <Button
          v-if="row.status === 'SUSPEND'"
          size="small"
          style="margin-left: 8px"
          type="primary"
          @click="onResume(row)"
        >
          恢复
        </Button>
      </template>
    </Grid>
  </Page>
</template>
