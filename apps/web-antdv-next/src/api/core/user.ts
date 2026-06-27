import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 后端 /api/user/info 响应（UserInfoService.UserInfo record）。
 * 后端返回 username/nickname/avatar/isSuper，需映射为 Vben UserInfo。
 */
interface FlexUserInfo {
  avatar: null | string;
  isSuper: boolean;
  nickname: string;
  username: string;
}

/**
 * 获取用户信息（后端契约 → Vben UserInfo）。
 *
 * 映射：nickname → realName；isSuper → roles(['super'])；
 * avatar 兜底空串（Vben UserInfo.avatar 为 string）。
 * homePath 由 Vben 用 preferences.app.defaultHomePath 兜底，无需后端提供。
 */
export async function getUserInfoApi() {
  const data = await requestClient.get<FlexUserInfo>('/user/info');
  const userInfo: UserInfo = {
    avatar: data?.avatar ?? '',
    desc: '',
    homePath: '',
    realName: data?.nickname ?? data?.username ?? '',
    roles: data?.isSuper ? ['super'] : [],
    token: '',
    userId: data?.isSuper ? '-1' : (data?.username ?? ''),
    username: data?.username ?? '',
  };
  return userInfo;
}
