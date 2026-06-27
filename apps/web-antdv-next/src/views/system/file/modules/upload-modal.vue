<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { Input, message, Modal, Select, Upload } from 'antdv-next';

import { uploadFileApi } from '#/api/system/file';

defineOptions({ name: 'FileUploadModal' });

const props = defineProps<{ open: boolean }>();
const emits = defineEmits<{
  (e: 'success'): void;
  (e: 'update:open', value: boolean): void;
}>();

const fileType = ref('PERMANENT');
const businessType = ref<string | undefined>(undefined);
const fileList = ref<any[]>([]);
const confirming = ref(false);

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emits('update:open', v),
});

// 打开时重置
watch(openModel, (isOpen) => {
  if (isOpen) {
    fileList.value = [];
    fileType.value = 'PERMANENT';
    businessType.value = undefined;
  }
});

async function onOk() {
  if (fileList.value.length === 0) {
    message.warning('请选择文件');
    return;
  }
  confirming.value = true;
  try {
    const file = fileList.value[0]!.originFileObj as File;
    await uploadFileApi(file, {
      businessType: businessType.value,
      fileType: fileType.value,
    });
    message.success('上传成功');
    emits('success');
    openModel.value = false;
  } finally {
    confirming.value = false;
  }
}

function beforeUpload(file: File) {
  fileList.value = [{ originFileObj: file, name: file.name }];
  return false; // 阻止自动上传，手动走 uploadFileApi
}
</script>

<template>
  <Modal
    v-model:open="openModel"
    title="上传文件"
    :confirm-loading="confirming"
    @ok="onOk"
  >
    <div class="space-y-3">
      <div>
        <div class="mb-1">文件类型</div>
        <Select
          v-model:value="fileType"
          :options="[
            { label: '永久', value: 'PERMANENT' },
            { label: '临时', value: 'TEMP' },
          ]"
          style="width: 200px"
        />
      </div>
      <div>
        <div class="mb-1">业务类型（可选）</div>
        <Input
          v-model:value="businessType"
          placeholder="如 AVATAR"
          style="width: 200px"
        />
      </div>
      <Upload :before-upload="beforeUpload" :max-count="1" :file-list="fileList">
        <a-button>选择文件</a-button>
      </Upload>
    </div>
  </Modal>
</template>
