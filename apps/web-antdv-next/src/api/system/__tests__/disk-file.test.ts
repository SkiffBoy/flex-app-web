import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  batchDeleteDiskFileApi,
  deleteDiskFileApi,
  getDiskFileContentApi,
  getDiskFilesApi,
  getDiskOverviewApi,
  getDiskStatsApi,
} from '../disk-file';

const mockGet = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { delete: mockDelete, get: mockGet };
  },
}));

describe('system/disk-file API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockDelete].forEach((m) => m.mockReset());
  });

  it('getDiskOverviewApi GET /admin/disk-file/overview', async () => {
    mockGet.mockResolvedValue({});
    await getDiskOverviewApi('node-1');
    expect(mockGet).toHaveBeenCalledWith('/admin/disk-file/overview', {
      params: { node: 'node-1' },
    });
  });

  it('getDiskStatsApi GET /admin/disk-file/stats', async () => {
    mockGet.mockResolvedValue([]);
    await getDiskStatsApi();
    expect(mockGet).toHaveBeenCalledWith('/admin/disk-file/stats', {
      params: { node: undefined },
    });
  });

  it('getDiskFilesApi 透传过滤', async () => {
    mockGet.mockResolvedValue({ rows: [], total: 0 });
    await getDiskFilesApi({
      date: '2026-06-24',
      module: 'IO_EXPORT',
      page: 1,
      size: 50,
    });
    expect(mockGet).toHaveBeenCalledWith('/admin/disk-file/files', {
      params: { date: '2026-06-24', module: 'IO_EXPORT', page: 1, size: 50 },
    });
  });

  it('getDiskFileContentApi GET content（blob + params）', async () => {
    mockGet.mockResolvedValue(new Blob());
    await getDiskFileContentApi({ inline: true, path: '/tmp/a.csv' });
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/disk-file/files/content',
      { params: { inline: true, path: '/tmp/a.csv' }, responseType: 'blob' },
    );
  });

  it('deleteDiskFileApi DELETE files（params: node+path）', async () => {
    mockDelete.mockResolvedValue(true);
    await deleteDiskFileApi('node-1', '/tmp/a.csv');
    expect(mockDelete).toHaveBeenCalledWith('/admin/disk-file/files', {
      params: { node: 'node-1', path: '/tmp/a.csv' },
    });
  });

  it('batchDeleteDiskFileApi DELETE batch（params: node+module+date）', async () => {
    mockDelete.mockResolvedValue(5);
    await batchDeleteDiskFileApi('node-1', 'IO_EXPORT', '2026-06-24');
    expect(mockDelete).toHaveBeenCalledWith('/admin/disk-file/batch', {
      params: { node: 'node-1', module: 'IO_EXPORT', date: '2026-06-24' },
    });
  });
});
