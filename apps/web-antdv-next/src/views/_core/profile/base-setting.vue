<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';

import { getUserInfoApi } from '#/api';

const profileBaseSettingRef = ref();
/** 角色 options：从后端 userInfo.roles 动态生成（非写死假数据）。 */
const roleOptions = ref<{ label: string; value: string }[]>([]);

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'realName',
      component: 'Input',
      label: '姓名',
    },
    {
      fieldName: 'username',
      component: 'Input',
      label: '用户名',
    },
    {
      fieldName: 'roles',
      component: 'Select',
      componentProps: {
        mode: 'tags',
        options: roleOptions.value,
      },
      label: '角色',
    },
    {
      fieldName: 'introduction',
      component: 'Textarea',
      label: '个人简介',
    },
  ];
});

onMounted(async () => {
  const data = await getUserInfoApi();
  // 把 userInfo.roles（如 ['super']）映射为 options
  roleOptions.value = (data.roles ?? []).map((r) => ({ label: r, value: r }));
  profileBaseSettingRef.value.getFormApi().setValues(data);
});
</script>
<template>
  <ProfileBaseSetting ref="profileBaseSettingRef" :form-schema="formSchema" />
</template>
