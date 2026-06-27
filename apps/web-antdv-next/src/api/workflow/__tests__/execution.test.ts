import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelExecutionApi,
  getExecutionDetailApi,
  getExecutionNodesApi,
  listExecutionApi,
  resumeExecutionApi,
  startExecutionApi,
} from '../execution';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { get: mockGet, post: mockPost };
  },
}));

describe('workflow/execution API 端点契约', () => {
  beforeEach(() => {
    [mockGet, mockPost].forEach((m) => m.mockReset());
  });

  it('startExecutionApi POST /execution/{definitionId}/start body={params}', async () => {
    mockPost.mockResolvedValue('inst-1');
    await startExecutionApi('def-1', { k: 'v' });
    expect(mockPost).toHaveBeenCalledWith('/wf/execution/def-1/start', { params: { k: 'v' } });
  });

  it('listExecutionApi GET /execution/list 透传 query', async () => {
    mockGet.mockResolvedValue([]);
    await listExecutionApi({ status: 'RUNNING', definitionId: 'def-1' });
    expect(mockGet).toHaveBeenCalledWith('/wf/execution/list', {
      params: { status: 'RUNNING', definitionId: 'def-1' },
    });
  });

  it('getExecutionDetailApi GET /execution/{instanceId}', async () => {
    mockGet.mockResolvedValue({ instanceId: 'i1' });
    await getExecutionDetailApi('inst-1');
    expect(mockGet).toHaveBeenCalledWith('/wf/execution/inst-1');
  });

  it('getExecutionNodesApi GET /execution/{instanceId}/nodes', async () => {
    mockGet.mockResolvedValue([]);
    await getExecutionNodesApi('inst-1');
    expect(mockGet).toHaveBeenCalledWith('/wf/execution/inst-1/nodes');
  });

  it('resumeExecutionApi POST /execution/{instanceId}/resume body={params}', async () => {
    mockPost.mockResolvedValue({});
    await resumeExecutionApi('inst-1', { k: 'v' });
    expect(mockPost).toHaveBeenCalledWith('/wf/execution/inst-1/resume', { params: { k: 'v' } });
  });

  it('cancelExecutionApi POST /execution/{instanceId}/cancel 无 body', async () => {
    mockPost.mockResolvedValue(undefined);
    await cancelExecutionApi('inst-1');
    expect(mockPost).toHaveBeenCalledWith('/wf/execution/inst-1/cancel');
  });
});
