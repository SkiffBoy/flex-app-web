import { requestClient } from '#/api/request';

export interface DiskFileModuleStats {
  fileCount: number;
  module: string;
  newestDate: string;
  oldestDate: string;
  residualCount: number;
  totalSize: number;
}

export interface DiskFilePageResult {
  rows: Record<string, any>[];
  total: number;
}

export function getDiskOverviewApi(node?: string) {
  return requestClient.get<Record<string, any>>('/admin/disk-file/overview', {
    params: { node },
  });
}

export function getDiskStatsApi(node?: string) {
  return requestClient.get<DiskFileModuleStats[]>('/admin/disk-file/stats', {
    params: { node },
  });
}

export function getDiskFilesApi(params: {
  date?: string;
  module?: string;
  node?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<DiskFilePageResult>('/admin/disk-file/files', {
    params,
  });
}

export function getDiskFileContentApi(params: {
  inline?: boolean;
  node?: string;
  path: string;
}) {
  return requestClient.get<Blob>('/admin/disk-file/files/content', {
    params,
    responseType: 'blob',
  });
}

export function deleteDiskFileApi(node: string | undefined, path: string) {
  return requestClient.delete<boolean>('/admin/disk-file/files', {
    params: { node, path },
  });
}

export function batchDeleteDiskFileApi(
  node: string | undefined,
  module: string,
  date: string,
) {
  return requestClient.delete<number>('/admin/disk-file/batch', {
    params: { node, module, date },
  });
}
