<script lang="ts" setup>
import type { SysDictData, SysDictType } from '#/api/system/dict';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Empty, Tag } from 'antdv-next';

import { getAllDictApi, getDictDataApi, getDictTypesApi } from '#/api/system/dict';

defineOptions({ name: 'SystemDict' });

const types = ref<SysDictType[]>([]);
const currentType = ref<null | SysDictType>(null);
const dataList = ref<SysDictData[]>([]);
const loading = ref(false);

async function loadTypes() {
  loading.value = true;
  try {
    types.value = await getDictTypesApi();
    if (types.value.length > 0) {
      await selectType(types.value[0]!);
    }
  } finally {
    loading.value = false;
  }
}

async function selectType(t: SysDictType) {
  currentType.value = t;
  dataList.value = await getDictDataApi(t.typeCode);
}

async function refreshAll() {
  loading.value = true;
  try {
    const all = await getAllDictApi();
    types.value = all.types;
    if (currentType.value) {
      dataList.value = all.items[currentType.value.typeCode] ?? [];
    } else if (types.value.length > 0) {
      await selectType(types.value[0]!);
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadTypes);
</script>

<template>
  <Page auto-content-height>
    <div class="flex gap-4">
      <Card class="w-72 shrink-0" title="字典类型">
        <template #extra>
          <a class="text-primary text-xs" @click="refreshAll">刷新缓存</a>
        </template>
        <div
          v-for="t in types"
          :key="t.id"
          class="hover:bg-muted cursor-pointer rounded px-2 py-1.5 text-sm transition"
          :class="{
            'bg-primary text-primary-foreground':
              currentType?.typeCode === t.typeCode,
          }"
          @click="selectType(t)"
        >
          <span>{{ t.typeName }}</span>
          <span class="text-muted-foreground ml-2 text-xs">{{ t.typeCode }}</span>
        </div>
        <Empty v-if="types.length === 0" :image="undefined" description="无字典类型" />
      </Card>

      <Card
        class="min-w-0 flex-1"
        :title="currentType ? `${currentType.typeName} 数据项` : '字典数据'"
      >
        <div v-if="dataList.length === 0">
          <Empty :image="undefined" description="无数据项" />
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b text-left">
              <th class="py-2">标签</th>
              <th>编码</th>
              <th>排序</th>
              <th>启用</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in dataList"
              :key="d.id"
              class="border-b last:border-0"
            >
              <td class="py-2">{{ d.dictLabel }}</td>
              <td>{{ d.dictCode }}</td>
              <td>{{ d.dictSort }}</td>
              <td>
                <Tag :color="d.enabled === 1 ? 'green' : 'default'">
                  {{ d.enabled === 1 ? '是' : '否' }}
                </Tag>
              </td>
              <td class="text-muted-foreground">{{ d.remark ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  </Page>
</template>
