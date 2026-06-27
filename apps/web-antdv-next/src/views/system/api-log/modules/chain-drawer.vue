<script lang="ts" setup>
import type { ApiLogBodyVo, ApiLogChainNode } from '#/api/system/api-log';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Empty, Spin, Tag, Timeline, TimelineItem } from 'antdv-next';

import { getApiLogBodyApi, getApiLogChainApi } from '#/api/system/api-log';

defineOptions({ name: 'ApiLogChainDrawer' });

const traceId = ref('');
const chain = ref<ApiLogChainNode[]>([]);
const bodyVo = ref<null | ApiLogBodyVo>(null);
const loadingNode = ref(false);

async function loadNode(node: ApiLogChainNode) {
  loadingNode.value = true;
  try {
    bodyVo.value = await getApiLogBodyApi(traceId.value, node.spanId);
  } finally {
    loadingNode.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onOpenChange(isOpen) {
    if (isOpen) {
      traceId.value = (drawerApi.getData() as unknown as string) || '';
      bodyVo.value = null;
      chain.value = await getApiLogChainApi(traceId.value);
    }
  },
});
</script>

<template>
  <Drawer title="调用链路">
    <div class="flex gap-4">
      <div class="w-1/2">
        <Timeline>
          <TimelineItem v-for="node in chain" :key="node.spanId">
            <div class="cursor-pointer" @click="loadNode(node)">
              <Tag :color="node.status >= 400 ? 'red' : 'green'">
                {{ node.status }}
              </Tag>
              <span class="ml-2 font-mono text-xs">
                {{ node.method }} {{ node.path }}
              </span>
              <div class="text-muted-foreground text-xs">
                {{ node.durationMs }}ms · {{ node.category }} ·
                {{ node.createdAt }}
              </div>
            </div>
          </TimelineItem>
        </Timeline>
        <Empty v-if="chain.length === 0" :image="undefined" description="无链路数据" />
      </div>
      <div class="w-1/2">
        <Spin :spinning="loadingNode">
          <div v-if="bodyVo">
            <div class="mb-2 text-sm font-medium">
              请求体（{{ bodyVo.requestSize }} bytes）
            </div>
            <pre class="bg-muted max-h-48 overflow-auto rounded p-2 text-xs">{{ bodyVo.requestBody ?? '(空或非文本)' }}</pre>
            <div class="mb-2 mt-3 text-sm font-medium">
              响应体（{{ bodyVo.responseSize }} bytes）
            </div>
            <pre class="bg-muted max-h-48 overflow-auto rounded p-2 text-xs">{{ bodyVo.responseBody ?? '(空或非文本)' }}</pre>
            <div v-if="bodyVo.truncated" class="text-muted-foreground mt-2 text-xs">
              ⚠ 已截断
            </div>
          </div>
          <Empty v-else :image="undefined" description="点击左侧节点查看请求/响应体" />
        </Spin>
      </div>
    </div>
  </Drawer>
</template>
