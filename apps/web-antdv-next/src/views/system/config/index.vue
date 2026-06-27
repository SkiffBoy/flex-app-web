<script lang="ts" setup>
import type { SystemConfigApi } from '#/api/system/config';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  message,
  Tag,
} from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import {
  getConfigApi,
  getConfigListApi,
  updateConfigApi,
} from '#/api/system/config';

defineOptions({ name: 'SystemConfig' });

const loading = ref(false);
const configMetas = ref<SystemConfigApi.ConfigMeta[]>([]);
const currentClass = ref<string>('');
const source = ref<SystemConfigApi.ConfigSource>('DEFAULT');
const yamlValue = ref<null | Record<string, any>>(null);

/** 按类型分栏（APP 主应用 / PLUGIN 插件）。 */
const appConfigs = computed(() =>
  configMetas.value.filter((c) => c.configType === 'APP'),
);
const pluginConfigs = computed(() => {
  const result: Record<string, SystemConfigApi.ConfigMeta[]> = {};
  for (const c of configMetas.value.filter((x) => x.configType === 'PLUGIN')) {
    const key = c.pluginId ?? 'unknown';
    (result[key] ??= []).push(c);
  }
  return result;
});

const sourceColor = computed(() => {
  if (source.value === 'DB') return 'green';
  if (source.value === 'YAML') return 'blue';
  return 'default';
});

const sourceText = computed(() => {
  if (source.value === 'DB') return 'DB（已覆盖）';
  if (source.value === 'YAML') return 'YAML（配置默认）';
  return 'DEFAULT（代码默认）';
});

/** SecurityPolicy 专用表单（当前唯一配置类，字段手写）。 */
const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'InputNumber',
      fieldName: 'minLength',
      label: '密码最小长度',
      defaultValue: 8,
      rules: 'required',
    },
    {
      component: 'Switch',
      fieldName: 'requireUppercase',
      label: '需大写字母',
      defaultValue: true,
    },
    {
      component: 'Switch',
      fieldName: 'requireLowercase',
      label: '需小写字母',
      defaultValue: true,
    },
    {
      component: 'Switch',
      fieldName: 'requireDigit',
      label: '需数字',
      defaultValue: true,
    },
    {
      component: 'Switch',
      fieldName: 'requireSpecial',
      label: '需特殊字符',
      defaultValue: true,
    },
    {
      component: 'Input',
      fieldName: 'specialChars',
      label: '特殊字符集',
      defaultValue: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    },
    {
      component: 'InputNumber',
      fieldName: 'passwordMaxAgeDays',
      label: '密码有效期(天)',
      defaultValue: 90,
      help: '0=永不过期',
    },
    {
      component: 'InputNumber',
      fieldName: 'maxFailedAttempts',
      label: '失败锁定阈值',
      defaultValue: 5,
    },
    {
      component: 'InputNumber',
      fieldName: 'lockDurationMinutes',
      label: '锁定时长(分钟)',
      defaultValue: 30,
    },
  ],
  showDefaultActions: false,
});

/** diff 字段（当前 vs yaml）。 */
const diffFields = computed(() => {
  if (!yamlValue.value) return [];
  return Object.keys(yamlValue.value);
});

async function loadList() {
  const list = await getConfigListApi();
  configMetas.value = list;
  // 默认选第一个 APP 配置类
  if (list.length > 0 && !currentClass.value) {
    const first = list[0];
    if (first) await selectConfig(first.simpleName);
  }
}

async function selectConfig(simpleName: string) {
  currentClass.value = simpleName;
  loading.value = true;
  try {
    const ws = await getConfigApi(simpleName);
    source.value = ws.source;
    yamlValue.value = ws.yamlValue ?? null;
    // SecurityPolicy 走专用表单
    if (simpleName === 'SecurityPolicy') {
      formApi.setValues(ws.value);
    }
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  if (currentClass.value !== 'SecurityPolicy') {
    message.info('该配置类暂未提供编辑表单');
    return;
  }
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues();
  loading.value = true;
  try {
    await updateConfigApi(currentClass.value, values);
    message.success('配置已保存（来源将变为 DB）');
    await selectConfig(currentClass.value);
  } finally {
    loading.value = false;
  }
}

loadList();
</script>

<template>
  <Page auto-content-height>
    <div class="flex gap-4">
      <!-- 左侧：配置类列表（APP / PLUGIN 分栏） -->
      <Card class="w-64 shrink-0" title="配置类">
        <div class="mb-3">
          <div class="mb-1 text-muted-foreground text-xs">主应用（APP）</div>
          <div
            v-for="c in appConfigs"
            :key="c.configClass"
            class="cursor-pointer rounded px-2 py-1 text-sm transition hover:bg-muted"
            :class="{
              'bg-primary text-primary-foreground':
                currentClass === c.simpleName,
            }"
            @click="selectConfig(c.simpleName)"
          >
            {{ c.displayName }}
          </div>
          <Empty
            v-if="appConfigs.length === 0"
            :image="undefined"
            description="无"
          />
        </div>
        <div v-if="Object.keys(pluginConfigs).length > 0">
          <div class="mb-1 text-muted-foreground text-xs">插件（PLUGIN）</div>
          <div v-for="(metas, pid) in pluginConfigs" :key="pid" class="mb-2">
            <div class="text-muted-foreground text-xs">{{ pid }}</div>
            <div
              v-for="c in metas"
              :key="c.configClass"
              class="cursor-pointer rounded px-2 py-1 text-sm transition hover:bg-muted"
              :class="{
                'bg-primary text-primary-foreground':
                  currentClass === c.simpleName,
              }"
              @click="selectConfig(c.simpleName)"
            >
              {{ c.displayName }}
            </div>
          </div>
        </div>
      </Card>

      <!-- 右侧：当前配置编辑 -->
      <div class="min-w-0 flex-1 space-y-4">
        <Card>
          <template #title>
            <span>当前配置</span>
            <span class="text-muted-foreground ml-2 text-sm">
              （{{ currentClass }}）
            </span>
          </template>
          <template #extra>
            <Tag :color="sourceColor">{{ sourceText }}</Tag>
          </template>
          <Descriptions :column="3" bordered size="small">
            <DescriptionsItem label="配置来源">
              <Tag :color="sourceColor">{{ source }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="当前生效">
              {{ source === 'DB' ? 'DB 行（env 覆盖）' : source }}
            </DescriptionsItem>
            <DescriptionsItem label="编辑表单">
              {{
                currentClass === 'SecurityPolicy'
                  ? '安全策略专用'
                  : '暂无（仅查看）'
              }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card v-if="currentClass === 'SecurityPolicy'" title="编辑配置">
          <Form />
          <div class="mt-4">
            <Button type="primary" :loading="loading" @click="onSave">
              保存（写入 DB，覆盖 yaml）
            </Button>
            <Button
              class="ml-2"
              :loading="loading"
              @click="selectConfig(currentClass)"
            >
              重置（重新拉取）
            </Button>
          </div>
        </Card>

        <Card v-else>
          <Empty description="该配置类暂未提供编辑表单（P2+ 按需补充）" />
        </Card>

        <Card v-if="yamlValue" title="YAML 对比（当前 vs yaml 默认）">
          <Descriptions :column="3" bordered size="small">
            <DescriptionsItem
              v-for="f in diffFields"
              :key="f"
              :label="String(f)"
            >
              <span class="text-muted-foreground line-through">
                {{ yamlValue?.[f] }}
              </span>
              <span class="ml-2 font-medium">→ 见上表</span>
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>
    </div>
  </Page>
</template>
