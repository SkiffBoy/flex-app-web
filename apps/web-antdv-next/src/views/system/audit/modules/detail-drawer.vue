<script lang="ts" setup>
import type { SysAuditLog } from '#/api/system/audit';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Descriptions, DescriptionsItem } from 'antdv-next';

defineOptions({ name: 'AuditDetailDrawer' });

const drawerData = ref<null | SysAuditLog>(null);

const [Drawer, drawerApi] = useVbenDrawer({
  onOpenChange(isOpen) {
    if (isOpen) {
      drawerData.value = drawerApi.getData<SysAuditLog>() || null;
    }
  },
});
</script>

<template>
  <Drawer title="审计日志详情">
    <Descriptions v-if="drawerData" :column="1" bordered size="small">
      <DescriptionsItem label="TraceID">
        {{ drawerData.traceId }}
      </DescriptionsItem>
      <DescriptionsItem label="模块">{{ drawerData.module }}</DescriptionsItem>
      <DescriptionsItem label="操作">{{ drawerData.action }}</DescriptionsItem>
      <DescriptionsItem label="操作人ID">
        {{ drawerData.operatorId }}
      </DescriptionsItem>
      <DescriptionsItem label="操作人类型">
        {{ drawerData.operatorType }}
      </DescriptionsItem>
      <DescriptionsItem label="目标类型">
        {{ drawerData.targetType }}
      </DescriptionsItem>
      <DescriptionsItem label="目标ID">
        {{ drawerData.targetId }}
      </DescriptionsItem>
      <DescriptionsItem label="目标名">
        {{ drawerData.targetName }}
      </DescriptionsItem>
      <DescriptionsItem label="详情">{{ drawerData.detail }}</DescriptionsItem>
      <DescriptionsItem label="客户端IP">
        {{ drawerData.clientIp }}
      </DescriptionsItem>
      <DescriptionsItem label="User-Agent">
        {{ drawerData.userAgent }}
      </DescriptionsItem>
      <DescriptionsItem label="时间">
        {{ drawerData.createdAt }}
      </DescriptionsItem>
    </Descriptions>
  </Drawer>
</template>
