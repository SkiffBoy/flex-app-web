<script lang="ts" setup>
import type { DefinitionGraph } from '#/api/workflow/definition';
import type {
  ChainStatus,
  FlowInstance,
  FlowNodeState,
  NodeStatus,
} from '#/api/workflow/execution';
import type { TinyflowData } from '#/views/workflow/designer/transform';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Tinyflow } from '@tinyflow-ai/vue';
import {
  Button,
  Descriptions,
  DescriptionsItem,
  message,
  Tag,
} from 'antdv-next';

import { getDefinitionDetailApi } from '#/api/workflow/definition';
import {
  cancelExecutionApi,
  getExecutionDetailApi,
  getExecutionNodesApi,
  resumeExecutionApi,
} from '#/api/workflow/execution';
import { useSSE } from '#/composables/use-sse';
import { transformFromBackend } from '#/views/workflow/designer/transform';

import '@tinyflow-ai/vue/dist/index.css';

defineOptions({ name: 'WorkflowMonitorDetail' });

const route = useRoute();
const instanceId = computed(() => route.params.instanceId as string);

const state = ref<FlowInstance | null>(null);
// ready 控制 <Tinyflow> 挂载：等 graph 加载完再挂载，避免空数据初始化后不响应。
const ready = ref(false);
const tinyflowData = ref<TinyflowData>({
  edges: [],
  nodes: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});
const nodeStatusMap = ref<Map<string, NodeStatus>>(new Map());
const loading = ref(false);

const statusColor: Record<ChainStatus, string> = {
  CANCELLED: 'default',
  ERROR: 'red',
  FAILED: 'red',
  READY: 'default',
  RUNNING: 'blue',
  SUSPEND: 'orange',
  SUCCEEDED: 'green',
};

const isSuspend = computed(() => state.value?.status === 'SUSPEND');

// SSE 实时：per-instance 频道 wf:{instanceId}。useSSE().subscribe 返回 unsubscribe。
const { connect, connected, subscribe, on } = useSSE();
let unsubscribeChannel: (() => void) | null = null;
let offNodeChanged: (() => void) | null = null;
let offInstanceCompleted: (() => void) | null = null;
let offInstanceFailed: (() => void) | null = null;
let offInstanceCancelled: (() => void) | null = null;
const channel = computed(() => `wf:${instanceId.value}`);
const isTerminal = computed(
  () =>
    state.value?.status === 'SUCCEEDED' ||
    state.value?.status === 'FAILED' ||
    state.value?.status === 'CANCELLED' ||
    state.value?.status === 'ERROR',
);
// 可取消：非终态（RUNNING/READY/SUSPEND/ERROR）均可取消（粘性下 trigger 在 owner 本地，cancel 直接生效）
const isCancellable = computed(() => !isTerminal.value);

// 进入时一次性加载（3 调用组装初始快照）；SSE 只推增量，初始状态仍需拉一次补全
async function loadAll() {
  loading.value = true;
  try {
    const detail = await getExecutionDetailApi(instanceId.value);
    state.value = detail;
    const graph: DefinitionGraph = await getDefinitionDetailApi(
      detail.definitionId,
    );
    tinyflowData.value = transformFromBackend(graph);
    const nodes = await getExecutionNodesApi(instanceId.value);
    nodeStatusMap.value = new Map(
      nodes.map((n: FlowNodeState) => [n.nodeId, n.status]),
    );
    ready.value = true; // 数据就绪后再挂载 Tinyflow
    applyNodeStatusColors();
  } finally {
    loading.value = false;
  }
}

// 节点状态色叠加：按 nodeStatusMap 给画布节点 DOM 注入状态 class。
// tinyflow 是 Web Component，DOM 异步渲染；用 nextTick + rAF + 兜底延时确保节点 DOM 已生成。
function applyNodeStatusColors() {
  const paint = () => {
    const root = document.querySelector('.monitor-canvas');
    if (!root) return;
    for (const [nodeId, status] of nodeStatusMap.value) {
      const el = root.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`);
      if (el instanceof HTMLElement) {
        el.classList.add(`node-${status.toLowerCase()}`);
      }
    }
  };
  // nextTick 等 Vue 渲染 → rAF 等浏览器布局 → 100ms 兜底等 Web Component 内部渲染
  nextTick(() => requestAnimationFrame(() => paint()));
  setTimeout(paint, 100);
}

// 订阅 wf:{instanceId} 频道（幂等：已订阅则先退订再订）
function subscribeChannel() {
  unsubscribeChannel?.();
  unsubscribeChannel = subscribe([channel.value]);
}

// 退订频道 + 解订事件 handler（终态或卸载时）
function teardownSSE() {
  unsubscribeChannel?.();
  unsubscribeChannel = null;
  offNodeChanged?.();
  offInstanceCompleted?.();
  offInstanceFailed?.();
  offInstanceCancelled?.();
  offNodeChanged = null;
  offInstanceCompleted = null;
  offInstanceFailed = null;
  offInstanceCancelled = null;
}

// 绑定 4 个 workflow 事件 handler（instanceId 防御性过滤）
function bindWorkflowEvents() {
  offNodeChanged = on('workflow.node.status_changed', (payload: any) => {
    if (payload?.instanceId !== instanceId.value) return;
    if (!payload?.nodeId || !payload?.newStatus) return;
    nodeStatusMap.value.set(payload.nodeId, payload.newStatus);
    applyNodeStatusColors();
  });
  offInstanceCompleted = on('workflow.instance.completed', (payload: any) => {
    if (payload?.instanceId !== instanceId.value) return;
    refreshMetaAndTeardown();
  });
  offInstanceFailed = on('workflow.instance.failed', (payload: any) => {
    if (payload?.instanceId !== instanceId.value) return;
    refreshMetaAndTeardown();
  });
  // cancel：后端标 CANCELLED 后推送 workflow.instance.cancelled（与 failed/completed 同走终态刷新）
  offInstanceCancelled = on('workflow.instance.cancelled', (payload: any) => {
    if (payload?.instanceId !== instanceId.value) return;
    refreshMetaAndTeardown();
  });
}

// 终态：单次拉新元信息 + 退订（节点色定格）
async function refreshMetaAndTeardown() {
  try {
    state.value = await getExecutionDetailApi(instanceId.value);
  } finally {
    teardownSSE();
  }
}

onMounted(async () => {
  await loadAll();
  // SSE 实时：连接 + 绑定事件 + 订阅频道（终态实例不订阅）
  if (!isTerminal.value) {
    connect();
    bindWorkflowEvents();
    if (connected.value) {
      subscribeChannel();
    }
  }
});

// 连接建立后订阅频道（处理进入页时连接未就绪的情况）
watch(connected, (isConn) => {
  if (isConn && !isTerminal.value && !unsubscribeChannel) {
    subscribeChannel();
  }
});

onUnmounted(() => {
  teardownSSE();
});

async function onResume() {
  await resumeExecutionApi(instanceId.value);
  message.success('已恢复，重新加载');
  ready.value = false; // 触发 Tinyflow 卸载，loadAll 后重新挂载新数据
  await loadAll();
  // 实例重新 RUNNING，重新订阅 SSE
  connect();
  bindWorkflowEvents();
  if (connected.value) subscribeChannel();
}

// 取消实例：移除后续 trigger + 标 CANCELLED（粘性下 trigger 在 owner 本地，直接生效）。
// SSE workflow.instance.cancelled 会触发 refreshMetaAndTeardown，这里仅发请求 + 兜底刷新。
async function onCancel() {
  await cancelExecutionApi(instanceId.value);
  message.success('已取消');
  ready.value = false;
  await loadAll();
}
</script>

<template>
  <Page :content-style="{ padding: '12px' }">
    <div v-if="state" style="margin-bottom: 12px">
      <Descriptions :column="4" bordered size="small" title="实例信息">
        <DescriptionsItem label="实例ID">
          {{ state.instanceId }}
        </DescriptionsItem>
        <DescriptionsItem label="状态">
          <Tag :color="statusColor[state.status]">{{ state.status }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="触发方式">
          {{ state.triggerType }}
        </DescriptionsItem>
        <DescriptionsItem label="耗时">
          {{ state.computeCost != null ? `${state.computeCost}ms` : '-' }}
        </DescriptionsItem>
        <DescriptionsItem v-if="state.error" :span="4" label="错误">
          <span style="color: #f5222d">{{ state.error }}</span>
        </DescriptionsItem>
      </Descriptions>
      <div style="margin-top: 8px">
        <Button v-if="isSuspend" type="primary" @click="onResume">
          恢复执行
        </Button>
        <Button
          v-if="isCancellable"
          danger
          style="margin-left: 8px"
          @click="onCancel"
        >
          取消实例
        </Button>
      </div>
    </div>
    <div v-loading="loading" class="monitor-canvas custom-tinyflow">
      <!-- SSE 实时：不传 customNodes，CSS pointer-events:none 只读。ready 后挂载 -->
      <Tinyflow v-if="ready" :data="tinyflowData" />
      <span v-else style="color: #999">加载中…</span>
    </div>
    <!-- 节点状态图例 -->
    <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 12px">
      <span><span class="legend legend-success"></span>成功</span>
      <span><span class="legend legend-running"></span>执行中</span>
      <span><span class="legend legend-failed"></span>失败</span>
      <span><span class="legend legend-pending"></span>未执行</span>
    </div>
  </Page>
</template>

<style scoped>
.monitor-canvas {
  width: 100%;
  height: calc(100vh - 280px);
  min-height: 300px;
}

:deep(.monitor-canvas) {
  pointer-events: none; /* 只读 */
}

/* 节点状态色（Task 12 冒烟验证 [data-node-id] 选择器是否生效；若不生效改用 customNodes render） */
.node-succeeded {
  border-color: #52c41a !important;
  box-shadow: 0 0 0 2px #52c41a !important;
}

.node-running {
  border-color: #1890ff !important;
  box-shadow: 0 0 0 2px #1890ff !important;
}

.node-failed,
.node-error {
  border-color: #f5222d !important;
  box-shadow: 0 0 0 2px #f5222d !important;
}

.node-ready,
.node-suspend {
  border-color: #faad14 !important;
  box-shadow: 0 0 0 2px #faad14 !important;
}

.legend {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-radius: 50%;
}

.legend-success {
  background: #52c41a;
}

.legend-running {
  background: #1890ff;
}

.legend-failed {
  background: #f5222d;
}

.legend-pending {
  background: #d9d9d9;
}
</style>
