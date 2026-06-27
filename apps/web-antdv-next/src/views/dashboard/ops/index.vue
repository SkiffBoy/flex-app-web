<script lang="ts" setup>
import type { OpsDashboardVo } from '#/api/system/dashboard';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Empty, Select, Skeleton, Statistic } from 'antdv-next';

import { getOpsDashboardApi } from '#/api/system/dashboard';

defineOptions({ name: 'DashboardOps' });

const data = ref<null | OpsDashboardVo>(null);
const loading = ref(false);
const node = ref<string | undefined>(undefined);

async function load() {
  loading.value = true;
  try {
    data.value = await getOpsDashboardApi(node.value);
    if (!node.value && data.value.nodes.length > 0) {
      node.value = data.value.nodes[0];
      data.value = await getOpsDashboardApi(node.value);
    }
  } finally {
    loading.value = false;
  }
}

function cardValue(key: string) {
  return data.value?.cards?.[key];
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex items-center justify-between">
      <span class="text-lg font-medium">运维看板</span>
      <Select
        v-if="data"
        v-model:value="node"
        :options="data.nodes.map((n) => ({ label: n, value: n }))"
        style="width: 180px"
        @change="load"
      />
    </div>

    <Skeleton v-if="loading" active />
    <Card v-else-if="!data || Object.keys(data.cards).length === 0">
      <Empty :image="undefined" description="无运维指标数据" />
    </Card>
    <div v-else class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card>
        <Statistic
          title="CPU 使用率"
          :value="cardValue('cpu-usage') ?? '-'"
          suffix="%"
        />
      </Card>
      <Card>
        <Statistic title="内存使用" :value="cardValue('memory-used') ?? '-'" />
      </Card>
      <Card>
        <Statistic title="GC 次数" :value="cardValue('gc-count') ?? '-'" />
      </Card>
      <Card>
        <Statistic
          title="活跃线程"
          :value="cardValue('thread-active') ?? '-'"
        />
      </Card>
      <Card>
        <Statistic
          title="DB 连接"
          :value="cardValue('db-pool-active') ?? '-'"
        />
      </Card>
      <Card>
        <Statistic
          title="Redis 延迟(ms)"
          :value="cardValue('redis-latency') ?? '-'"
        />
      </Card>
      <Card>
        <Statistic
          title="SSE 连接"
          :value="cardValue('sse-connections') ?? '-'"
        />
      </Card>
      <Card>
        <Statistic
          title="磁盘使用率"
          :value="cardValue('disk-usage') ?? '-'"
          suffix="%"
        />
      </Card>
    </div>
    <!-- TODO(P2): memory/cpu/gc/thread-trend 折线图待 card 数据结构确认后补 echarts -->
  </Page>
</template>
