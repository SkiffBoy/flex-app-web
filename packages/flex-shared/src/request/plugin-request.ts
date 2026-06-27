/**
 * @flex/shared 不自带 axios 实例，由主 Shell 启动时注入（保持框架无关）。
 * pluginId 仅用于错误归属标识，不自动拼 URL 前缀。
 */

interface MinimalHttpClient {
  delete: (url: string, config?: any) => Promise<any>;
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, data?: any, config?: any) => Promise<any>;
  put: (url: string, data?: any, config?: any) => Promise<any>;
}

let httpClient: MinimalHttpClient | undefined;

/**
 * 主 Shell 启动时注入 http client（已配置 baseURL + Token 拦截器 + Result 解壳）。
 */
export function setHttpClient(client: MinimalHttpClient): void {
  httpClient = client;
}

/**
 * 插件获取 http client（继承主 Shell Token）。
 * @param pluginId 仅用于错误归属标识，不影响请求 URL
 */
export function usePluginRequest(pluginId: string): MinimalHttpClient {
  if (!httpClient) {
    throw new Error(
      `插件 ${pluginId} 调用 usePluginRequest 失败：httpClient 未注入，请先在主应用 bootstrap 调 setHttpClient`,
    );
  }
  return httpClient;
}
