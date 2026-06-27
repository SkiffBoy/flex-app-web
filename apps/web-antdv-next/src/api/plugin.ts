import type { PluginMetadata } from '@flex/shared';

import { requestClient } from '#/api/request';

/**
 * 获取已加载插件的前端元数据（spec §3.3，URL 方案 1）。
 * requestClient 已配 responseReturn:'data' + baseURL=/api，直接拿到 Result.data。
 * 注意路径不带 /api 前缀（baseURL 已含），否则会变成 /api/api/extensions/...
 */
export async function getPluginMetadata(): Promise<PluginMetadata[]> {
  return requestClient.get<PluginMetadata[]>('/extensions/metadata');
}
