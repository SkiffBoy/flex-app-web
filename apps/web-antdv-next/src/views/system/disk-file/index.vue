<script lang="ts" setup>
import type { DiskFileModuleStats } from '#/api/system/disk-file';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Empty, message, Modal, Statistic, Table } from 'antdv-next';

import {
  batchDeleteDiskFileApi,
  getDiskFilesApi,
  getDiskOverviewApi,
  getDiskStatsApi,
} from '#/api/system/disk-file';

defineOptions({ name: 'SystemDiskFile' });

const overview = ref<Record<string, any>>({});
const stats = ref<DiskFileModuleStats[]>([]);
const rows = ref<Record<string, any>[]>([]);
const loading = ref(false);

const filter = ref({ date: '', module: '' });

async function loadOverview() {
  overview.value = await getDiskOverviewApi();
  stats.value = await getDiskStatsApi();
}

async function loadFiles() {
  loading.value = true;
  try {
    const data = await getDiskFilesApi({
      date: filter.value.date || undefined,
      module: filter.value.module || undefined,
      page: 1,
      size: 50,
    });
    rows.value = data.rows;
  } finally {
    loading.value = false;
  }
}

function onBatchClean(s: DiskFileModuleStats) {
  if (!filter.value.date) {
    message.warning('请先填写日期');
    return;
  }
  Modal.confirm({
    title: '批量清理确认',
    content: `确定清理模块「${s.module}」日期「${filter.value.date}」的所有磁盘文件吗？`,
    onOk: async () => {
      const n = await batchDeleteDiskFileApi(
        undefined,
        s.module,
        filter.value.date,
      );
      message.success(`已清理 ${n} 个文件`);
      loadOverview();
      loadFiles();
    },
  });
}

// 历史行字段动态，按返回的首行 keys 生成列
function fileColumns() {
  if (rows.value.length === 0) return [];
  return Object.keys(rows.value[0]!).map((k) => ({
    dataIndex: k,
    key: k,
    title: k,
  }));
}

onMounted(async () => {
  await loadOverview();
  await loadFiles();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card>
        <Statistic title="总占用" :value="overview.totalSize ?? 0" suffix="B" />
      </Card>
      <Card>
        <Statistic title="文件总数" :value="overview.fileCount ?? 0" />
      </Card>
    </div>

    <Card class="mb-4" title="模块统计">
      <Table
        v-if="stats.length > 0"
        :columns="[
          { dataIndex: 'module', key: 'module', title: '模块' },
          { dataIndex: 'totalSize', key: 'totalSize', title: '占用(B)' },
          { dataIndex: 'fileCount', key: 'fileCount', title: '文件数' },
          { dataIndex: 'residualCount', key: 'residualCount', title: '残留数' },
          { dataIndex: 'oldestDate', key: 'oldestDate', title: '最早' },
          { dataIndex: 'newestDate', key: 'newestDate', title: '最新' },
          { key: 'op', title: '操作' },
        ]"
        :data-source="stats"
        row-key="module"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <a
            v-if="column.key === 'op'"
            class="text-primary"
            @click="onBatchClean(record as DiskFileModuleStats)"
          >
            批量清理
          </a>
        </template>
      </Table>
      <Empty v-else :image="undefined" description="无模块统计" />
    </Card>

    <Card title="磁盘文件">
      <div class="mb-3 flex gap-2">
        <input
          v-model="filter.module"
          class="border rounded px-2 py-1 text-sm"
          placeholder="模块"
        />
        <input
          v-model="filter.date"
          class="border rounded px-2 py-1 text-sm"
          placeholder="日期 YYYY-MM-DD"
        />
        <a-button type="primary" @click="loadFiles">查询</a-button>
      </div>
      <Table
        :columns="fileColumns()"
        :data-source="rows"
        :loading="loading"
        :pagination="{ pageSize: 50 }"
        row-key="path"
        size="small"
      />
    </Card>
  </Page>
</template>
