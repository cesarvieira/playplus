import type { H3Event } from 'h3';
import { describe, expect, it, vi } from 'vitest';

import { serverApiFetch } from '../api-client.server';

const serverApiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('~~/server/utils/server-api-fetch', () => ({
  serverApiFetch: serverApiFetchMock,
}));

const event = { context: {} } as unknown as H3Event;

describe('serverApiFetch wrapper', () => {
  it('delega para util Nitro server-api-fetch', async () => {
    serverApiFetchMock.mockResolvedValue({ id: 'user-1' });

    await expect(serverApiFetch(event, '/me', { method: 'GET' })).resolves.toEqual({ id: 'user-1' });
    expect(serverApiFetchMock).toHaveBeenCalledWith(event, '/me', { method: 'GET' });
  });
});
