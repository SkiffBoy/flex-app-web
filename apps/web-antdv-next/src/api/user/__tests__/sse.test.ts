import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSseTicketApi } from '../sse';

const mockPost = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  get requestClient() {
    return { post: mockPost };
  },
}));

describe('user/sse API 端点契约', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('getSseTicketApi POST /sse/ticket', async () => {
    mockPost.mockResolvedValue({ ticket: 'abc', ttl: 30 });
    await getSseTicketApi();
    expect(mockPost).toHaveBeenCalledWith('/sse/ticket');
  });
});
