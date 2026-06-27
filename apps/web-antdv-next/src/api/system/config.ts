import { requestClient } from '#/api/request';

export namespace SystemConfigApi {
  /** 配置类元数据（GET /admin/config/list 返回）。 */
  export interface ConfigMeta {
    configClass: string; // 全名
    configType: 'APP' | 'PLUGIN';
    displayName: string;
    pluginId: null | string;
    simpleName: string;
  }

  /** SecurityPolicy（spec §1.2 b，9 字段，当前唯一配置类）。 */
  export interface SecurityPolicy {
    lockDurationMinutes: number;
    maxFailedAttempts: number;
    minLength: number;
    passwordMaxAgeDays: number;
    requireDigit: boolean;
    requireLowercase: boolean;
    requireSpecial: boolean;
    requireUppercase: boolean;
    specialChars: string;
  }

  /** 配置来源（三级回退）。 */
  export type ConfigSource = 'DB' | 'DEFAULT' | 'YAML';

  /** DynamicConfigService.getWithSource 返回结构。 */
  export interface ConfigWithSource {
    defaultValue: Record<string, any>;
    source: ConfigSource;
    value: Record<string, any>;
    yamlValue: null | Record<string, any>;
  }
}

/** 列出所有已注册配置类（spec §4.5.6）。 */
export function getConfigListApi() {
  return requestClient.get<SystemConfigApi.ConfigMeta[]>('/admin/config/list');
}

/** 读取配置 + 来源追踪（configClass 支持全名/简单名）。 */
export function getConfigApi(configClass: string) {
  return requestClient.get<SystemConfigApi.ConfigWithSource>(
    `/admin/config/${configClass}`,
  );
}

/** 更新配置（JSON body，configClass 支持全名/简单名）。 */
export function updateConfigApi(
  configClass: string,
  data: Record<string, any>,
) {
  return requestClient.put(`/admin/config/${configClass}`, data);
}

/** 读取安全策略（便捷封装，等价 getConfigApi('SecurityPolicy')）。 */
export function getSecurityPolicyApi() {
  return getConfigApi('SecurityPolicy');
}

/** 更新安全策略（便捷封装）。 */
export function updateSecurityPolicyApi(data: SystemConfigApi.SecurityPolicy) {
  return updateConfigApi('SecurityPolicy', data);
}
