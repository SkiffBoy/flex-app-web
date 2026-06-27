<script lang="ts" setup>
import type { TaskInfo } from '#/api/system/task';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Input, message } from 'antdv-next';

import { rescheduleTaskApi } from '#/api/system/task';

defineOptions({ name: 'TaskScheduleDrawer' });

const task = ref<null | TaskInfo>(null);
const schedule = ref('');

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!task.value) return;
    drawerApi.lock();
    try {
      await rescheduleTaskApi(task.value.taskName, { schedule: schedule.value });
      message.success('调度已更新');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      task.value = drawerApi.getData<TaskInfo>() || null;
      schedule.value = task.value?.schedule ?? '';
    }
  },
});
</script>

<template>
  <Drawer title="修改调度">
    <div class="space-y-2">
      <div class="text-sm">任务：{{ task?.taskName }}</div>
      <div class="text-muted-foreground text-sm">
        当前调度：<code>{{ task?.schedule }}</code>
      </div>
      <Input v-model:value="schedule" placeholder="如 0 0 * * * （cron）" />
    </div>
  </Drawer>
</template>
