import { requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数（后端 LoginRequest 契约：username/password/captchaCode/captchaKey） */
  export interface LoginParams {
    captchaCode?: string;
    captchaKey?: string;
    password?: string;
    username?: string;
  }

  /** 登录接口返回值（后端 LoginResponse：tokenValue/tokenName） */
  export interface LoginResult {
    tokenName: string;
    tokenValue: string;
  }

  /** 密码是否已过期标记（登录成功但密码超龄，需引导改密）。 */
  export interface LoginResultWithMeta extends LoginResult {
    passwordExpired?: boolean;
  }
}

/**
 * 登录
 *
 * 后端返回 { tokenValue, tokenName, passwordExpired? }，
 * 这里把 tokenValue 映射为 accessStore 期望的 accessToken。
 */
export async function loginApi(data: AuthApi.LoginParams) {
  const resp = await requestClient.post<AuthApi.LoginResultWithMeta>(
    '/auth/login',
    data,
  );
  return resp;
}

/**
 * 刷新accessToken
 *
 * 用 requestClient（带 Flex-Token 拦截器）：后端 /auth/refresh 虽在白名单，
 * 但 StpUtil.checkLogin() 需从 Flex-Token header 读当前登录态续期。
 * requestClient 的 responseReturn:'data' 会剥掉 Result 外层，直接返回 LoginResponse。
 */
export async function refreshTokenApi() {
  return requestClient.post<AuthApi.LoginResult>('/auth/refresh');
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/auth/logout');
}

/**
 * 当前登录用户自助改密（后端 POST /api/auth/change-password）。
 * 校验旧密码 + 新密码复杂度，成功后 passwordChangedAt 更新（过期标记清除）。
 */
export async function changePasswordApi(data: {
  newPassword: string;
  oldPassword: string;
}) {
  return requestClient.post('/auth/change-password', data);
}

/**
 * 获取用户权限码（后端 GET /api/user/permissions，超管 ["*"]）
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/user/permissions');
}
