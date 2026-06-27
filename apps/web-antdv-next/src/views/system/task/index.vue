<script lang="ts" setup>
import type { TaskInfo } from '#/api/system/task';

import { ref } from 'vue';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';

import { message, Spin, Tag } from 'antdv-next';

import {
  disableTaskApi,
  enableTaskApi,
  getTaskListApi,
  triggerTaskApi,
} from '#/api/system/task';

import HistoryDrawer from './modules/history-drawer.vue';
import ScheduleDrawer from './modules/schedule-drawer.vue';

defineOptions({ name: 'SystemTask' });

const taskList = ref<TaskInfo[]>([]);
const loading = ref(false);

const [ScheduleDrawerComp, scheduleDrawerApi] = useVbenDrawer({
  connectedComponent: ScheduleDrawer,
  destroyOnClose: true,
});
const [HistoryDrawerComp, historyDrawerApi] = useVbenDrawer({
  connectedComponent: HistoryDrawer,
  destroyOnClose: true,
});

async function load() {
  loading.value = true;
  try {
    taskList.value = await getTaskListApi();
  } finally {
    loading.value = false;
  }
}

async function onToggle(row: TaskInfo) {
  if (row.enabled) {
    await disableTaskApi(row.taskName);
    message.success('已禁用');
  } else {
    await enableTaskApi(row.taskName);
    message.success('已启用');
  }
  load();
}

async function onTrigger(row: TaskInfo) {
  await triggerTaskApi(row.taskName);
  message.success('已触发');
  load();
}

function onSchedule(row: TaskInfo) {
  scheduleDrawerApi.setData(row).open();
}

function onHistory(row: TaskInfo) {
  historyDrawerApi.setData(row.taskName).open();
}

load();
</script>

<template>
  <Page auto-content-height>
    <ScheduleDrawerComp @success="load" />
    <HistoryDrawerComp />
    <Spin :spinning="loading">
      <div class="bg-card overflow-auto rounded">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left">
              <th class="py-2">任务名</th>
              <th>显示名</th>
              <th>分类</th>
              <th>类型</th>
              <th>启用</th>
              <th>调度</th>
              <th>下次执行</th>
              <th>上次成功</th>
              <th>上次失败</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in taskList"
              :key="row.taskName"
              class="border-b last:border-0"
            >
              <td class="py-2 font-mono text-xs">{{ row.taskName }}</td>
              <td>{{ row.label }}</td>
              <td>{{ row.category }}</td>
              <td>
                <Tag :color="row.type === 'SYSTEM' ? 'default' : 'blue'">
                  {{ row.type }}
                </Tag>
              </td>
              <td>
                <Tag :color="row.enabled ? 'green' : 'default'">
                  {{ row.enabled ? '启用' : '禁用' }}
                </Tag>
              </td>
              <td class="font-mono text-xs">{{ row.schedule }}</td>
              <td>{{ row.nextExecutionTime ?? '-' }}</td>
              <td>{{ row.lastSuccess ?? '-' }}</td>
              <td>{{ row.lastFailure ?? '-' }}</td>
              <td>
                <VbenTableAction
                  :actions="
                    row.type === 'SYSTEM'
                      ? [{ text: '历史', onClick: () => onHistory(row) }]
                      : [
                          {
                            text: row.enabled ? '禁用' : '启用',
                            onClick: () => onToggle(row),
                          },
                          { text: '触发', onClick: () => onTrigger(row) },
                          { text: '调度', onClick: () => onSchedule(row) },
                          { text: '历史', onClick: () => onHistory(row) },
                        ]
                  "
                  align="center"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Spin>
  </Page>
</template>
