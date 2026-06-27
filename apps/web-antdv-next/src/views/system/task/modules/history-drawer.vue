<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Empty, Spin, Table } from 'antdv-next';

import { getTaskHistoryApi } from '#/api/system/task';

defineOptions({ name: 'TaskHistoryDrawer' });

const rows = ref<Record<string, any>[]>([]);
const loading = ref(false);

const [Drawer, drawerApi] = useVbenDrawer({
  async onOpenChange(isOpen) {
    if (isOpen) {
      const taskName = (drawerApi.getData() as unknown as string) || '';
      loading.value = true;
      try {
        const data = await getTaskHistoryApi(taskName, { page: 1, size: 20 });
        rows.value = data.rows;
      } finally {
        loading.value = false;
      }
    }
  },
});

// 历史行字段动态（FlowInstance），按返回的首行 keys 生成列
function columns() {
  if (rows.value.length === 0) return [];
  return Object.keys(rows.value[0]!).map((k) => ({
    dataIndex: k,
    key: k,
    title: k,
  }));
}
</script>

<template>
  <Drawer title="执行历史">
    <Spin :spinning="loading">
      <Table
        v-if="rows.length > 0"
        :columns="columns()"
        :data-source="rows"
        :pagination="{ pageSize: 20 }"
        row-key="id"
        size="small"
      />
      <Empty v-else :image="undefined" description="无执行历史" />
    </Spin>
  </Drawer>
</template>
