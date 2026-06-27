<script lang="ts" setup>
import type { SystemMenuApi } from '#/api/system/menu';
import type { SystemPermissionApi } from '#/api/system/permission';
import type { SystemUserApi } from '#/api/system/user';

import { ref } from 'vue';

import { Tree, useVbenDrawer } from '@vben/common-ui';

import { Checkbox, message, Spin } from 'antdv-next';

import { getMenuListApi } from '#/api/system/menu';
import {
  getPermissionGroupListApi,
  getPermissionListApi,
} from '#/api/system/permission';
import { assignUserGrantsApi, getUserGrantsApi } from '#/api/system/user';

defineOptions({ name: 'GrantDrawer' });

const emits = defineEmits(['success']);
let userId = 0;
const loading = ref(false);
const menuTreeData = ref<any[]>([]);
const permissionGroups = ref<SystemPermissionApi.SysPermissionGroup[]>([]);
const allPermissions = ref<SystemPermissionApi.SysPermission[]>([]);
const checkedMenuIds = ref<number[]>([]);
const checkedPermIds = ref<number[]>([]);

/** 扁平菜单建树（与 menu.ts 转换逻辑一致，但保留 id 供勾选）。 */
function buildMenuTree(list: SystemMenuApi.SysMenu[]): any[] {
  const nodes = new Map<number, any>();
  for (const m of list) {
    nodes.set(m.id, {
      id: m.id,
      key: m.id,
      title: m.menuName,
      parentId: m.parentId,
      children: [],
    });
  }
  const roots: any[] = [];
  for (const n of nodes.values()) {
    if (n.parentId !== null && nodes.has(n.parentId)) {
      nodes.get(n.parentId).children.push(n);
    } else {
      roots.push(n);
    }
  }
  return roots;
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    drawerApi.lock();
    try {
      await assignUserGrantsApi(userId, {
        menuIds: checkedMenuIds.value,
        permissionIds: checkedPermIds.value,
      });
      message.success('授权已保存');
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<SystemUserApi.SysUser>();
      userId = data?.id ?? 0;
      loading.value = true;
      try {
        const [menus, groups, perms, grants] = await Promise.all([
          getMenuListApi(),
          getPermissionGroupListApi(),
          getPermissionListApi(),
          getUserGrantsApi(userId),
        ]);
        menuTreeData.value = buildMenuTree(menus);
        permissionGroups.value = groups;
        allPermissions.value = perms;
        checkedMenuIds.value = grants.menuIds ?? [];
        checkedPermIds.value = grants.permissionIds ?? [];
      } finally {
        loading.value = false;
      }
    }
  },
});

function isPermChecked(id: number) {
  return checkedPermIds.value.includes(id);
}

function togglePerm(id: number, checked: boolean) {
  if (checked) {
    if (!checkedPermIds.value.includes(id)) checkedPermIds.value.push(id);
  } else {
    checkedPermIds.value = checkedPermIds.value.filter((x) => x !== id);
  }
}

function permsInGroup(groupCode: string) {
  return allPermissions.value.filter((p) => p.groupCode === groupCode);
}
</script>

<template>
  <Drawer title="分配授权" class="w-[600px]">
    <Spin :spinning="loading">
      <div class="space-y-6">
        <div>
          <h4 class="mb-2 font-medium">菜单授权</h4>
          <Tree
            v-model="checkedMenuIds"
            :tree-data="menuTreeData"
            :default-expanded-level="2"
            value-field="id"
            label-field="title"
            multiple
            bordered
          />
        </div>
        <div>
          <h4 class="mb-2 font-medium">权限授权</h4>
          <div
            v-for="group in permissionGroups"
            :key="group.groupCode"
            class="mb-3 rounded-md border border-border p-3"
          >
            <div class="mb-2 font-medium text-sm">
              {{ group.groupName }}
              <span class="text-muted-foreground">
                （{{ group.groupCode }}）
              </span>
            </div>
            <div class="flex flex-wrap gap-4">
              <Checkbox
                v-for="perm in permsInGroup(group.groupCode)"
                :key="perm.id"
                :checked="isPermChecked(perm.id)"
                @change="(e: any) => togglePerm(perm.id, e.target.checked)"
              >
                {{ perm.permissionName }}
                <span class="text-muted-foreground text-xs">
                  （{{ perm.permissionCode }}）
                </span>
              </Checkbox>
            </div>
          </div>
        </div>
      </div>
    </Spin>
  </Drawer>
</template>
