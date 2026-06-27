<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { FileInfo } from '#/api/system/file';

import { Page, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'antdv-next';

import { ref } from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteFileApi,
  downloadFileApi,
  getFileListApi,
} from '#/api/system/file';

import UploadModal from './modules/upload-modal.vue';

defineOptions({ name: 'SystemFile' });

const uploadVisible = ref(false);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'fileName', title: '文件名', minWidth: 200 },
      { field: 'fileType', title: '类型', width: 100 },
      { field: 'mimeType', title: 'MIME', width: 140 },
      { field: 'fileSize', title: '大小(B)', width: 100 },
      { field: 'businessType', title: '业务类型', width: 120 },
      { field: 'storagePath', title: '存储路径', minWidth: 200 },
      { field: 'expiresAt', title: '过期时间', width: 170 },
      {
        field: 'action',
        title: '操作',
        width: 160,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 20 },
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          const data = await getFileListApi({
            page: page.currentPage,
            size: page.pageSize,
          });
          return { items: data.rows, total: data.total };
        },
      },
    },
    rowConfig: { keyField: 'fileKey' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<FileInfo>,
});

function onRefresh() {
  gridApi.query();
}

function onUpload() {
  uploadVisible.value = true;
}

async function onDownload(row: FileInfo) {
  const blob = await downloadFileApi(row.fileKey);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = row.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function onDelete(row: FileInfo) {
  Modal.confirm({
    title: '删除确认',
    content: `确定删除文件「${row.fileName}」吗？`,
    onOk: async () => {
      await deleteFileApi(row.fileKey);
      message.success('已删除');
      onRefresh();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <UploadModal v-model:open="uploadVisible" @success="onRefresh" />
    <Grid table-title="文件管理">
      <template #toolbar-tools>
        <Button type="primary" @click="onUpload">
          <Plus class="size-5" />
          上传文件
        </Button>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            { text: '下载', onClick: () => onDownload(row) },
            {
              danger: true,
              popConfirm: {
                confirm: () => onDelete(row),
                title: `确定删除「${row.fileName}」？`,
              },
              text: '删除',
            },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
