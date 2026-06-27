<script lang="ts" setup>
import type { SystemPermissionApi } from '#/api/system/permission';

import { computed, ref } from 'vue';

import { Page, useVbenDrawer, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, Empty, message, Modal, Tag } from 'antdv-next';

import {
  deletePermissionApi,
  getPermissionGroupListApi,
  getPermissionListApi,
} from '#/api/system/permission';

import PermissionForm from './modules/permission-form.vue';

defineOptions({ name: 'SystemPermission' });

const groups = ref<SystemPermissionApi.SysPermissionGroup[]>([]);
const permissions = ref<SystemPermissionApi.SysPermission[]>([]);
const loading = ref(false);

const [PermissionFormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: PermissionForm,
  destroyOnClose: true,
});

/** 按组分组（组按 sortOrder，权限按 id）。 */
const groupedPermissions = computed(() => {
  return groups.value
    .toSorted((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((g) => ({
      group: g,
      items: permissions.value
        .filter((p) => p.groupCode === g.groupCode)
        .toSorted((a, b) => a.id - b.id),
    }));
});

async function loadData() {
  loading.value = true;
  try {
    const [g, p] = await Promise.all([
      getPermissionGroupListApi(),
      getPermissionListApi(),
    ]);
    groups.value = g;
    permissions.value = p;
  } finally {
    loading.value = false;
  }
}

function onCreate(groupCode?: string) {
  formDrawerApi.setData({ groupCode }).open();
}

function onEdit(row: SystemPermissionApi.SysPermission) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemPermissionApi.SysPermission) {
  Modal.confirm({
    content: `确定删除权限「${row.permissionCode}」吗？`,
    onOk: async () => {
      await deletePermissionApi(row.id);
      message.success('已删除');
      await loadData();
    },
    title: '删除确认',
  });
}

loadData();
</script>

<template>
  <Page auto-content-height>
    <PermissionFormDrawer @success="loadData" />
    <div class="flex items-center justify-between pb-3">
      <h3 class="text-base font-semibold">权限点管理</h3>
      <Button
        v-access:code="'sys.permission.create'"
        type="primary"
        :loading="loading"
        @click="onCreate()"
      >
        <Plus class="size-5" />
        新增权限
      </Button>
    </div>

    <Empty v-if="groupedPermissions.length === 0" description="暂无权限组" />

    <div
      v-for="gp in groupedPermissions"
      :key="gp.group.groupCode"
      class="mb-4 rounded-md border border-border"
    >
      <div
        class="flex items-center justify-between border-b border-border bg-muted px-4 py-2"
      >
        <div class="font-medium">
          {{ gp.group.groupName }}
          <span class="text-muted-foreground text-xs">
            （{{ gp.group.groupCode }}）
          </span>
        </div>
        <Button
          v-access:code="'sys.permission.create'"
          size="small"
          @click="onCreate(gp.group.groupCode)"
        >
          <Plus class="size-4" />
          新增
        </Button>
      </div>
      <div v-if="gp.items.length === 0" class="px-4 py-3 text-muted-foreground">
        该组暂无权限点
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="p in gp.items"
          :key="p.id"
          class="flex items-center justify-between px-4 py-2"
        >
          <div class="flex items-center gap-3">
            <Tag color="blue">{{ p.permissionCode }}</Tag>
            <span>{{ p.permissionName }}</span>
            <span v-if="p.description" class="text-muted-foreground text-xs">
              {{ p.description }}
            </span>
          </div>
          <VbenTableAction
            :actions="[
              { text: '编辑', onClick: () => onEdit(p) },
              {
                text: '删除',
                danger: true,
                popConfirm: {
                  title: `确定删除「${p.permissionCode}」？`,
                  confirm: () => onDelete(p),
                },
              },
            ]"
            align="center"
          />
        </div>
      </div>
    </div>
  </Page>
</template>
