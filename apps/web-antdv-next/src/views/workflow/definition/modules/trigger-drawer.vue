<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';
import { message, TextArea } from 'antdv-next';

import { startExecutionApi } from '#/api/workflow/execution';

defineOptions({ name: 'WorkflowTriggerDrawer' });

const emit = defineEmits<{ success: [] }>();
const router = useRouter();

const definitionId = ref('');
const paramsText = ref('{}');

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    let params: Record<string, any> = {};
    try {
      params = paramsText.value.trim() ? JSON.parse(paramsText.value) : {};
    } catch {
      message.error('参数 JSON 格式错误');
      return;
    }
    drawerApi.lock();
    try {
      const instanceId = await startExecutionApi(definitionId.value, params);
      message.success('已触发');
      emit('success');
      drawerApi.close();
      router.push(`/workflow/monitor/${instanceId}`);
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<{ definitionId: string; name: string }>();
      definitionId.value = data.definitionId;
      paramsText.value = '{}';
    }
  },
});
</script>

<template>
  <Drawer title="手动触发">
    <p style="margin-bottom: 8px">输入参数（JSON）：</p>
    <TextArea
      v-model:value="paramsText"
      :auto-size="{ minRows: 6, maxRows: 16 }"
      placeholder='{"key":"value"}'
    />
  </Drawer>
</template>
