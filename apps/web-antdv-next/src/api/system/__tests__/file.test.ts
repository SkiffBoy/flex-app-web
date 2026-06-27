import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteFileApi,
  downloadFileApi,
  getFileListApi,
  uploadFileApi,
} from '../file';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { delete: mockDelete, get: mockGet, post: mockPost };
  },
}));

describe('system/file API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost, mockDelete].forEach((m) => m.mockReset());
  });

  it('uploadFileApi POST /system/file/upload（FormData 含 file + fileType）', async () => {
    mockPost.mockResolvedValue({});
    const file = new File(['x'], 'a.txt');
    await uploadFileApi(file, { businessType: 'AVATAR', fileType: 'TEMP' });
    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockPost.mock.calls[0]!;
    expect(url).toBe('/system/file/upload');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('fileType')).toBe('TEMP');
    expect(body.get('businessType')).toBe('AVATAR');
    expect(body.get('file')).toBe(file);
  });

  it('uploadFileApi 默认 fileType=PERMANENT', async () => {
    mockPost.mockResolvedValue({});
    await uploadFileApi(new File(['x'], 'a.txt'));
    const body = mockPost.mock.calls[0]![1] as FormData;
    expect(body.get('fileType')).toBe('PERMANENT');
  });

  it('getFileListApi 透传 params', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getFileListApi({ fileType: 'PERMANENT', page: 1, size: 20 });
    expect(mockGet).toHaveBeenCalledWith('/system/file/list', {
      params: { fileType: 'PERMANENT', page: 1, size: 20 },
    });
  });

  it('downloadFileApi GET /system/file/download/{key}（blob）', async () => {
    mockGet.mockResolvedValue(new Blob());
    await downloadFileApi('abc-key');
    expect(mockGet).toHaveBeenCalledWith('/system/file/download/abc-key', {
      responseType: 'blob',
    });
  });

  it('deleteFileApi DELETE /system/file/{key}', async () => {
    mockDelete.mockResolvedValue(undefined);
    await deleteFileApi('abc-key');
    expect(mockDelete).toHaveBeenCalledWith('/system/file/abc-key');
  });
});
