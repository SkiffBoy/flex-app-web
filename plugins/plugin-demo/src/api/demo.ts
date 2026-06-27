import { usePluginRequest } from '@flex/shared';

// pluginId 仅用于错误归属标识，不拼 URL 前缀（spec §7.4）
const request = usePluginRequest('plugin-demo');

/** 调后端 demo 插件 GET /demo/hello */
export async function getDemoHello(): Promise<{ msg: string }> {
  // request 已配置 responseReturn: 'data'，返回的就是 Result.data
  return await request.get('/demo/hello');
}

/** 调后端 demo 插件 GET /demo/fail（故意触发 BizException，验证隔离） */
export async function getDemoFail(): Promise<any> {
  return await request.get('/demo/fail');
}
