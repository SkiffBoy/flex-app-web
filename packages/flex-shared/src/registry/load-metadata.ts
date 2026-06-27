import type { PluginMetadata } from '../types';

/**
 * 调 GET /api/extensions/metadata 拉取插件元数据。
 * @param request 主 Shell 注入的 http client（已配置 baseURL + Token + Result 解壳拦截器）
 */
export async function loadPluginMetadata(request: {
  get: (url: string) => Promise<any>;
}): Promise<PluginMetadata[]> {
  // request 已配置 responseReturn: 'data'，返回的就是 Result.data
  return await request.get('/api/extensions/metadata');
}
