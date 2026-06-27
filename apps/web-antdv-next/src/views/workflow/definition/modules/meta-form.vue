<script lang="ts" setup>
import type { DefinitionDto, FlowDefinition } from '#/api/workflow/definition';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import {
  getDefinitionDetailApi,
  updateDefinitionApi,
} from '#/api/workflow/definition';

defineOptions({ name: 'WorkflowMetaForm' });

const emit = defineEmits<{ success: [] }>();

const drawerData = ref<FlowDefinition | null>(null);
const isEdit = computed(() => !!drawerData.value?.id);
// 后端 update 是全量替换（删旧 nodes/edges 再重写），故重命名须保留原图快照一起回写，
// 否则只发 name 会把图清空。打开时加载完整 DefinitionGraph。
const graphSnapshot = ref<DefinitionDto>({
  description: null,
  edges: [],
  name: '',
  nodes: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

const [Form, formApi] = useVbenForm({
  schema: [
    { component: 'Input', fieldName: 'name', label: '名称', rules: 'required' },
    { component: 'Textarea', fieldName: 'description', label: '描述' },
  ],
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    if (!drawerData.value) return;
    drawerApi.lock();
    try {
      await updateDefinitionApi(drawerData.value.id, {
        ...graphSnapshot.value,
        description: values.description ?? null,
        name: values.name,
      });
      message.success('已保存');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      drawerData.value = drawerApi.getData<FlowDefinition>();
      formApi.resetForm();
      if (drawerData.value) {
        const graph = await getDefinitionDetailApi(drawerData.value.id);
        graphSnapshot.value = {
          description: graph.description,
          edges: graph.edges,
          name: graph.name,
          nodes: graph.nodes,
          viewport: graph.viewport ?? { x: 0, y: 0, zoom: 1 },
        };
        formApi.setValues({
          description: graph.description ?? '',
          name: graph.name,
        });
      }
    }
  },
});
</script>

<template>
  <Drawer :title="isEdit ? '编辑信息' : '新建'">
    <Form />
  </Drawer>
</template>
