<script lang="ts" setup>
import type { PreferenceItem } from '#/api/user/notification';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message, Switch, Table } from 'antdv-next';

import {
  getPreferencesApi,
  updatePreferencesApi,
} from '#/api/user/notification';

defineOptions({ name: 'NotificationPreferenceDrawer' });

const items = ref<PreferenceItem[]>([]);
const loading = ref(false);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    drawerApi.lock();
    try {
      await updatePreferencesApi({ items: items.value });
      message.success('偏好已保存');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      loading.value = true;
      try {
        items.value = await getPreferencesApi();
      } finally {
        loading.value = false;
      }
    }
  },
});
</script>

<template>
  <Drawer title="通知偏好">
    <Table
      :columns="[
        { dataIndex: 'category', key: 'category', title: '分类' },
        { dataIndex: 'channel', key: 'channel', title: '渠道' },
        { dataIndex: 'enabled', key: 'enabled', title: '启用' },
        { dataIndex: 'dndEnabled', key: 'dndEnabled', title: '免打扰' },
        { dataIndex: 'dndStart', key: 'dndStart', title: '免打扰起' },
        { dataIndex: 'dndEnd', key: 'dndEnd', title: '免打扰止' },
      ]"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="category"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <Switch
          v-if="column.key === 'enabled'"
          :checked="record.enabled === 1"
          @change="(v: boolean) => (record.enabled = v ? 1 : 0)"
        />
        <Switch
          v-else-if="column.key === 'dndEnabled'"
          :checked="record.dndEnabled === 1"
          @change="(v: boolean) => (record.dndEnabled = v ? 1 : 0)"
        />
      </template>
    </Table>
  </Drawer>
</template>
