import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelScheduleApi,
  createDefinitionApi,
  deleteDefinitionApi,
  disableDefinitionApi,
  enableDefinitionApi,
  getDefinitionDetailApi,
  getDefinitionListApi,
  scheduleDefinitionApi,
  updateDefinitionApi,
} from '../definition';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { delete: mockDelete, get: mockGet, post: mockPost, put: mockPut };
  },
}));

describe('workflow/definition API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost, mockPut, mockDelete].forEach((m) => m.mockReset());
  });

  it('getDefinitionListApi GET /definition/list', async () => {
    mockGet.mockResolvedValue([]);
    await getDefinitionListApi();
    expect(mockGet).toHaveBeenCalledWith('/wf/definition/list');
  });

  it('getDefinitionDetailApi GET /definition/{id}', async () => {
    mockGet.mockResolvedValue({ id: 'x', nodes: [], edges: [] });
    await getDefinitionDetailApi('def-1');
    expect(mockGet).toHaveBeenCalledWith('/wf/definition/def-1');
  });

  it('createDefinitionApi POST /definition body', async () => {
    mockPost.mockResolvedValue('new-id');
    const body = { name: 'f', description: null, viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], edges: [] };
    await createDefinitionApi(body);
    expect(mockPost).toHaveBeenCalledWith('/wf/definition', body);
  });

  it('updateDefinitionApi PUT /definition/{id} body', async () => {
    mockPut.mockResolvedValue(undefined);
    const body = { name: 'f', description: null, viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], edges: [] };
    await updateDefinitionApi('def-1', body);
    expect(mockPut).toHaveBeenCalledWith('/wf/definition/def-1', body);
  });

  it('deleteDefinitionApi DELETE /definition/{id}', async () => {
    mockDelete.mockResolvedValue(undefined);
    await deleteDefinitionApi('def-1');
    expect(mockDelete).toHaveBeenCalledWith('/wf/definition/def-1');
  });

  it('enableDefinitionApi PUT /definition/{id}/enable', async () => {
    mockPut.mockResolvedValue(undefined);
    await enableDefinitionApi('def-1');
    expect(mockPut).toHaveBeenCalledWith('/wf/definition/def-1/enable');
  });

  it('disableDefinitionApi PUT /definition/{id}/disable', async () => {
    mockPut.mockResolvedValue(undefined);
    await disableDefinitionApi('def-1');
    expect(mockPut).toHaveBeenCalledWith('/wf/definition/def-1/disable');
  });

  it('scheduleDefinitionApi PUT /definition/{id}/schedule body={cron,params}', async () => {
    mockPut.mockResolvedValue(undefined);
    await scheduleDefinitionApi('def-1', '0 0 2 * * ?', { k: 'v' });
    expect(mockPut).toHaveBeenCalledWith('/wf/definition/def-1/schedule', {
      cron: '0 0 2 * * ?',
      params: { k: 'v' },
    });
  });

  it('cancelScheduleApi DELETE /definition/{id}/schedule', async () => {
    mockDelete.mockResolvedValue(undefined);
    await cancelScheduleApi('def-1');
    expect(mockDelete).toHaveBeenCalledWith('/wf/definition/def-1/schedule');
  });
});
