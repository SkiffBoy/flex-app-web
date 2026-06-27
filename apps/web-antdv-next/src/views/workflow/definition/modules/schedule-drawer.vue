<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Input, message, TextArea } from 'antdv-next';

import {
  cancelScheduleApi,
  scheduleDefinitionApi,
} from '#/api/workflow/definition';
import { describeCron } from '#/views/workflow/designer/transform';

defineOptions({ name: 'WorkflowScheduleDrawer' });

const emit = defineEmits<{ success: [] }>();

const definitionId = ref('');
const cron = ref('');
const paramsText = ref('{}');
const preview = computed(() =>
  cron.value.trim() ? describeCron(cron.value.trim()) : '',
);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!cron.value.trim()) {
      message.warning('请输入 cron 表达式');
      return;
    }
    let params: Record<string, any> = {};
    try {
      params = paramsText.value.trim() ? JSON.parse(paramsText.value) : {};
    } catch {
      message.error('参数 JSON 格式错误');
      return;
    }
    drawerApi.lock();
    try {
      await scheduleDefinitionApi(
        definitionId.value,
        cron.value.trim(),
        params,
      );
      message.success('已设置定时');
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<{ definitionId: string; name: string }>();
      definitionId.value = data.definitionId;
      cron.value = '';
      paramsText.value = '{}';
    }
  },
});

function onCancelSchedule() {
  cancelScheduleApi(definitionId.value).then(() => {
    message.success('已取消定时');
    emit('success');
    drawerApi.close();
  });
}
</script>

<template>
  <Drawer title="定时配置">
    <div style="margin-bottom: 12px">
      <p style="margin-bottom: 4px">
        Cron 表达式（Quartz 6 字段：秒 分 时 日 月 周）
      </p>
      <Input v-model:value="cron" placeholder="0 0 2 * * ?" />
      <p v-if="preview" style="margin-top: 4px; color: #1890ff">
        {{ preview }}
      </p>
    </div>
    <div>
      <p style="margin-bottom: 4px">参数（JSON，可选）：</p>
      <TextArea
        v-model:value="paramsText"
        :auto-size="{ minRows: 4, maxRows: 10 }"
        placeholder="{}"
      />
    </div>
    <template #footer>
      <Button danger style="float: left" @click="onCancelSchedule">
        取消定时
      </Button>
    </template>
  </Drawer>
</template>
