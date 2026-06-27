<script lang="ts" setup>
import type { DashboardOverviewVo } from '#/api/system/dashboard';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Empty, Select, Skeleton, Statistic } from 'antdv-next';

import { getDashboardOverviewApi } from '#/api/system/dashboard';

defineOptions({ name: 'DashboardBusiness' });

const data = ref<null | DashboardOverviewVo>(null);
const loading = ref(false);
const period = ref('7D');

async function load() {
  loading.value = true;
  try {
    data.value = await getDashboardOverviewApi(period.value);
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
      <span class="text-lg font-medium">运营看板</span>
      <Select
        v-model:value="period"
        :options="[
          { label: '近7天', value: '7D' },
          { label: '近30天', value: '30D' },
        ]"
        style="width: 140px"
        @change="load"
      />
    </div>

    <Skeleton v-if="loading" active />

    <!-- 降级：后端未实现 -->
    <Card v-else-if="data && !data.implemented">
      <Empty :description="data.message || '运营看板数据尚未实现'" />
    </Card>

    <!-- 真实数据：数字卡片 -->
    <div v-else-if="data" class="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Card>
        <Statistic
          title="在线用户"
          :value="cardValue('online-users') ?? '-'"
        />
      </Card>
      <Card>
        <Statistic
          title="今日登录"
          :value="cardValue('today-logins') ?? '-'"
        />
      </Card>
      <Card>
        <Statistic title="API 调用" :value="cardValue('api-traffic') ?? '-'" />
      </Card>
      <Card>
        <Statistic
          title="API 错误率"
          :value="cardValue('api-error-rate') ?? '-'"
          suffix="%"
        />
      </Card>
      <Card>
        <Statistic title="通知" :value="cardValue('notification') ?? '-'" />
      </Card>
    </div>
    <!-- TODO(P2): login-trend 折线图待 card 数据结构确认后补 echarts 渲染 -->
  </Page>
</template>
