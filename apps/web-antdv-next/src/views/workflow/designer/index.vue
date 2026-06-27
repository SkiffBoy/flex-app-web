<script lang="ts" setup>
import type { TinyflowData } from './transform';

import type { DefinitionDto } from '#/api/workflow/definition';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Tinyflow } from '@tinyflow-ai/vue';
import { Button, Input, message } from 'antdv-next';

import {
  createDefinitionApi,
  getDefinitionDetailApi,
  updateDefinitionApi,
} from '#/api/workflow/definition';

import { CUSTOM_NODES } from './custom-nodes';
import { transformFromBackend, transformToBackend } from './transform';

import '@tinyflow-ai/vue/dist/index.css';

defineOptions({ name: 'WorkflowDesigner' });

const route = useRoute();
const router = useRouter();
const id = computed(() => (route.params.id as string | undefined) ?? undefined);

const tinyflowRef = ref<InstanceType<typeof Tinyflow> | null>(null);
// ready 控制 <Tinyflow> 挂载时机：编辑模式下等 detail 加载完再挂载，
// 避免 Tinyflow 用空数据初始化后不响应 initialData 变更（底层 Svelte 仅构造时读 data）。
const ready = ref(false);
const initialData = ref<TinyflowData>({
  edges: [],
  nodes: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});
const meta = reactive({ description: '' as string | undefined, name: '' });
const loading = ref(false);

onMounted(async () => {
  if (!id.value) {
    // 新建模式：空画布，立即可挂载
    ready.value = true;
    return;
  }
  loading.value = true;
  try {
    const graph = await getDefinitionDetailApi(id.value);
    meta.name = graph.name;
    meta.description = graph.description ?? undefined;
    initialData.value = transformFromBackend(graph);
    ready.value = true; // 数据就绪后再挂载 Tinyflow
  } finally {
    loading.value = false;
  }
});

async function onSave() {
  if (!meta.name.trim()) {
    message.warning('请输入工作流名称');
    return;
  }
  const data = tinyflowRef.value?.getData() as unknown as null | TinyflowData;
  if (!data) {
    message.error('画布未初始化');
    return;
  }
  const body: DefinitionDto = transformToBackend(
    data,
    meta.name.trim(),
    meta.description,
  );
  loading.value = true;
  try {
    if (id.value) {
      await updateDefinitionApi(id.value, body);
      message.success('已保存');
    } else {
      const newId = await createDefinitionApi(body);
      message.success('已创建');
      router.replace(`/workflow/designer/${newId}`);
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Page
    :content-style="{
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }"
  >
    <div class="designer-toolbar">
      <Input
        v-model:value="meta.name"
        placeholder="工作流名称"
        style="max-width: 320px"
      />
      <Input
        v-model:value="meta.description"
        placeholder="描述（可选）"
        style="max-width: 320px; margin-left: 8px"
      />
      <Button :loading="loading" type="primary" @click="onSave">保存</Button>
    </div>
    <div v-if="!ready" class="custom-tinyflow designer-loading">
      <span style="color: #999">加载中…</span>
    </div>
    <div v-else class="custom-tinyflow">
      <Tinyflow
        ref="tinyflowRef"
        :custom-nodes="CUSTOM_NODES"
        :data="initialData"
      />
    </div>
  </Page>
</template>

<style scoped>
.designer-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
}

.custom-tinyflow {
  flex: 1;
  width: 100%;
  min-height: 0;
}

/* 官方文档 antdv 冲突覆盖（checkbox/select） */
:deep(.custom-tinyflow) select {
  appearance: auto !important;
}

:deep(.custom-tinyflow) input[type='checkbox'] {
  position: relative;
  width: 18px;
  height: 18px;
  margin: 0 8px 0 0;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}
</style>
