import { requestClient } from '#/api/request';

/** 后端 SysDictType（继承 BaseEntity：id/createdAt）。 */
export interface SysDictType {
  createdAt: string;
  enabled: number;
  id: number;
  pluginId: null | string;
  remark: null | string;
  scope: string;
  typeCode: string;
  typeName: string;
}

/** 后端 SysDictData。 */
export interface SysDictData {
  createdAt: string;
  cssClass: null | string;
  dictCode: string;
  dictLabel: string;
  dictSort: number;
  enabled: number;
  id: number;
  remark: null | string;
  typeCode: string;
}

/** /all 返回（items 按 typeCode 分组）。 */
export interface DictAllResult {
  items: Record<string, SysDictData[]>;
  types: SysDictType[];
}

/** 字典类型列表。 */
export function getDictTypesApi() {
  return requestClient.get<SysDictType[]>('/system/dict/types');
}

/** 某类型的字典数据。 */
export function getDictDataApi(typeCode: string) {
  return requestClient.get<SysDictData[]>(`/system/dict/data/${typeCode}`);
}

/** 全量字典（登录后一次性拉取）。 */
export function getAllDictApi() {
  return requestClient.get<DictAllResult>('/system/dict/all');
}
