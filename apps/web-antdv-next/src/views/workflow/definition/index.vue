<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { FlowDefinition } from '#/api/workflow/definition';

import { useRouter } from 'vue-router';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteDefinitionApi,
  disableDefinitionApi,
  enableDefinitionApi,
  getDefinitionListApi,
} from '#/api/workflow/definition';

import MetaForm from './modules/meta-form.vue';
import ScheduleDrawer from './modules/schedule-drawer.vue';
import TriggerDrawer from './modules/trigger-drawer.vue';

defineOptions({ name: 'WorkflowDefinition' });

const router = useRouter();

const [MetaDrawer, metaDrawerApi] = useVbenDrawer({
  connectedComponent: MetaForm,
  destroyOnClose: true,
});
const [TriggerComp, triggerDrawerApi] = useVbenDrawer({
  connectedComponent: TriggerDrawer,
  destroyOnClose: true,
});
const [ScheduleComp, scheduleDrawerApi] = useVbenDrawer({
  connectedComponent: ScheduleDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'name', minWidth: 180, title: '名称' },
      { field: 'enabled', slots: { default: 'enabled' }, title: '状态', width: 100 },
      { field: 'version', title: '版本', width: 80 },
      {
        field: 'updatedAt',
        slots: { default: 'updatedAt' },
        title: '更新时间',
        width: 180,
      },
      {
        field: 'action',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 260,
      },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          const rows = await getDefinitionListApi();
          return { items: rows, total: rows.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: false, zoom: true },
  } as VxeTableGridOptions<FlowDefinition>,
});

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  router.push('/workflow/designer');
}

function onEdit(row: FlowDefinition) {
  router.push(`/workflow/designer/${row.id}`);
}

function onTrigger(row: FlowDefinition) {
  triggerDrawerApi.setData({ definitionId: row.id, name: row.name }).open();
}

function onToggle(row: FlowDefinition) {
  const fn = row.enabled === 1 ? disableDefinitionApi : enableDefinitionApi;
  fn(row.id).then(() => {
    message.success(row.enabled === 1 ? '已停用' : '已启用');
    onRefresh();
  });
}

function onSchedule(row: FlowDefinition) {
  scheduleDrawerApi.setData({ definitionId: row.id, name: row.name }).open();
}

function onRename(row: FlowDefinition) {
  metaDrawerApi.setData(row).open();
}

function onDelete(row: FlowDefinition) {
  Modal.confirm({
    content: `确认删除工作流「${row.name}」？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    title: '删除确认',
    onOk: () =>
      deleteDefinitionApi(row.id).then(() => {
        message.success('已删除');
        onRefresh();
      }),
  });
}

function formatTime(v: null | string) {
  return v ?? '-';
}
</script>

<template>
  <Page auto-content-height>
    <MetaDrawer @success="onRefresh" />
    <TriggerComp @success="onRefresh" />
    <ScheduleComp @success="onRefresh" />
    <Grid table-title="工作流定义">
      <template #toolbar-tools>
        <Button type="primary" @click="onCreate">
          <Plus class="size-5" /> 新建工作流
        </Button>
      </template>
      <template #enabled="{ row }">
        <Tag :color="row.enabled === 1 ? 'green' : 'default'">
          {{ row.enabled === 1 ? '启用' : '停用' }}
        </Tag>
      </template>
      <template #updatedAt="{ row }">{{ formatTime(row.updatedAt) }}</template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            { text: '编辑', onClick: () => onEdit(row) },
            { text: '触发', onClick: () => onTrigger(row) },
          ]"
          :dropdown-actions="[
            {
              text: row.enabled === 1 ? '停用' : '启用',
              onClick: () => onToggle(row),
            },
            { text: '定时配置', onClick: () => onSchedule(row) },
            { text: '重命名', onClick: () => onRename(row) },
            { text: '删除', danger: true, onClick: () => onDelete(row) },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
