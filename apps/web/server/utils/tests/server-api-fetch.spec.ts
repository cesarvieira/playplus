import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { serverApiFetch } from '../server-api-fetch';

const ensureServerSessionMock = vi.hoisted(() => vi.fn());
const apiOfetchMock = vi.hoisted(() => vi.fn());

vi.mock('../runtime-config', () => ({
  getServerRuntimeConfig: () => ({
    m2mServiceToken: 'm2m-token',
    delegationJwtSecret: 'delegation-secret',
    delegationJwtTtlSeconds: 60,
    apiInternalBaseUrl: 'http://localhost:3000/v1',
    public: { apiUrl: 'http://localhost:3000/v1' },
  }),
}));

vi.mock('../session-refresh', () => ({
  ensureServerSession: ensureServerSessionMock,
}));

vi.mock('../api-ofetch.server', () => ({
  apiOfetch: apiOfetchMock,
}));

const event = { context: {} } as unknown as H3Event;

describe('serverApiFetch', () => {
  beforeEach(() => {
    ensureServerSessionMock.mockReset();
    apiOfetchMock.mockReset();
  });

  it('chama API com M2M e header X-User-Id delegado', async () => {
    ensureServerSessionMock.mockResolvedValue({
      userId: 'user-1',
      role: USER_ROLE.VIEWER,
      exp: 9999999999,
    });
    apiOfetchMock.mockResolvedValue({ id: 'user-1' });

    const result = await serverApiFetch(event, '/me', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    expect(result).toEqual({ id: 'user-1' });
    expect(apiOfetchMock).toHaveBeenCalledWith(
      '/me',
      expect.objectContaining({
        method: 'GET',
        baseURL: 'http://localhost:3000/v1',
        headers: expect.any(Headers),
      }),
    );

    const headers = apiOfetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer m2m-token');
    expect(headers.get('X-User-Id')).toBeTypeOf('string');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('lança 401 quando não há sessão server', async () => {
    ensureServerSessionMock.mockResolvedValue(null);

    await expect(serverApiFetch(event, '/me')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sessão inválida ou expirada.',
    });
    expect(apiOfetchMock).not.toHaveBeenCalled();
  });
});
