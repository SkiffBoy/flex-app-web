<script lang="ts" setup>
import type { SyncPipeline } from '#/api/system/data-sync';

import { ref } from 'vue';

import { Page, VbenTableAction } from '@vben/common-ui';

import { message, Spin, Tag } from 'antdv-next';

import {
  getSyncPipelineListApi,
  triggerSyncApi,
} from '#/api/system/data-sync';

defineOptions({ name: 'SystemDataSync' });

const list = ref<SyncPipeline[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    list.value = await getSyncPipelineListApi();
  } catch {
    // 端点可能未就绪，静默
  } finally {
    loading.value = false;
  }
}

async function onTrigger(row: SyncPipeline) {
  if (!row.apiTriggerPath) {
    message.warning('该链路未配置触发路径');
    return;
  }
  const res = await triggerSyncApi(row.apiTriggerPath);
  if (res.status === 'RUNNING') {
    message.success(`已触发，批次 ${res.batchId}`);
  } else {
    message.warning(res.message || 'pipeline 正在执行');
  }
}

function modeLabel(m: number) {
  if (m === 2) return 'API写Kafka';
  if (m === 3) return 'API导出文件';
  return `模式${m}`;
}

load();
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <div class="bg-card overflow-auto rounded">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left">
              <th class="py-2">链路名</th>
              <th>编码</th>
              <th>模式</th>
              <th>触发路径</th>
              <th>启用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in list"
              :key="row.id"
              class="border-b last:border-0"
            >
              <td class="py-2">{{ row.pipelineName }}</td>
              <td class="font-mono text-xs">{{ row.pipelineCode }}</td>
              <td>
                <Tag :color="row.mode === 3 ? 'blue' : 'default'">
                  {{ modeLabel(row.mode) }}
                </Tag>
              </td>
              <td class="font-mono text-xs">{{ row.apiTriggerPath ?? '-' }}</td>
              <td>
                <Tag :color="row.enabled ? 'green' : 'default'">
                  {{ row.enabled ? '启用' : '禁用' }}
                </Tag>
              </td>
              <td>
                <VbenTableAction
                  :actions="[
                    { text: '触发', onClick: () => onTrigger(row) },
                  ]"
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
