import { requestClient } from '#/api/request';

export interface FileInfo {
  businessType: null | string;
  expiresAt: null | string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  storagePath: string;
}

export interface FilePageResult {
  rows: FileInfo[];
  total: number;
}

/** 上传（multipart）。 */
export function uploadFileApi(
  file: File,
  opts: {
    businessId?: string;
    businessType?: string;
    fileType?: string; // 默认 PERMANENT
  } = {},
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', opts.fileType ?? 'PERMANENT');
  if (opts.businessType) formData.append('businessType', opts.businessType);
  if (opts.businessId) formData.append('businessId', opts.businessId);
  return requestClient.post<FileInfo>('/system/file/upload', formData);
}

export function getFileListApi(params: {
  businessType?: string;
  fileType?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<FilePageResult>('/system/file/list', { params });
}

/** 下载（blob）。 */
export function downloadFileApi(key: string) {
  return requestClient.get<Blob>(`/system/file/download/${key}`, {
    responseType: 'blob',
  });
}

export function deleteFileApi(key: string) {
  return requestClient.delete(`/system/file/${key}`);
}
