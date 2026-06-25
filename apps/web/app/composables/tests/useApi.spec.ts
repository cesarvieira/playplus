import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withApiContext } from '~/test-utils/auth.harness';

const { apiFetchMock, navigateToMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  navigateToMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/utils/api-client', () => ({
  apiFetch: apiFetchMock,
}));

mockNuxtImport('navigateTo', () => navigateToMock);
mockNuxtImport('useRoute', () => () => ({
  fullPath: '/catalog',
  query: {},
}));

describe('useApi', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    navigateToMock.mockClear();
  });

  it('calls ensureSession when client has no token', async () => {
    await withApiContext(async ({ store, api }) => {
      const refreshSpy = vi.spyOn(store, 'refresh').mockResolvedValue(false);
      apiFetchMock.mockResolvedValueOnce({ data: [] });

      await api('/videos');

      expect(refreshSpy).toHaveBeenCalledOnce();
      expect(apiFetchMock).toHaveBeenCalledOnce();
    });
  });

  it('skips ensureSession for auth endpoints', async () => {
    await withApiContext(async ({ store, api }) => {
      const refreshSpy = vi.spyOn(store, 'refresh').mockResolvedValue(false);
      refreshSpy.mockClear();
      apiFetchMock.mockResolvedValueOnce({ access_token: 'token', expires_in: 900 });

      await api('/auth/login', { method: 'POST', body: { email: 'a', password: 'b' } });

      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });

  it('attaches Bearer header when access token is present', async () => {
    await withApiContext(async ({ store, api }) => {
      store.accessToken = 'access-token';
      apiFetchMock.mockResolvedValueOnce({ ok: true });

      await api('/videos');

      const headers = apiFetchMock.mock.calls[0]?.[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer access-token');
    });
  });

  it('retries once after successful refresh on 401', async () => {
    await withApiContext(async ({ store, api }) => {
      store.accessToken = 'expired';
      vi.spyOn(store, 'refresh').mockResolvedValue(true);

      apiFetchMock
        .mockRejectedValueOnce({ statusCode: 401 })
        .mockResolvedValueOnce({ data: [{ id: 'video-1' }] });

      const result = await api<{ data: { id: string }[] }>('/videos');

      expect(result).toEqual({ data: [{ id: 'video-1' }] });
      expect(apiFetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it('clears session and redirects when refresh fails after 401', async () => {
    await withApiContext(async ({ store, api }) => {
      store.accessToken = 'expired';
      store.user = {
        id: 'user-1',
        email: 'viewer@playplus.localhost',
        role: 'viewer',
        createdAt: '2025-01-01T00:00:00Z',
      };
      vi.spyOn(store, 'refresh').mockResolvedValue(false);

      apiFetchMock.mockRejectedValueOnce({ statusCode: 401 });

      await expect(api('/videos')).rejects.toEqual({ statusCode: 401 });

      expect(store.accessToken).toBeNull();
      expect(navigateToMock).toHaveBeenCalledWith(
        '/login?reason=session_expired&redirect=%2Fcatalog',
      );
    });
  });

  it('does not retry auth endpoints on 401', async () => {
    await withApiContext(async ({ store, api }) => {
      const refreshSpy = vi.spyOn(store, 'refresh').mockResolvedValue(false);
      refreshSpy.mockClear();
      apiFetchMock.mockRejectedValueOnce({ statusCode: 401 });

      await expect(api('/auth/login', { method: 'POST' })).rejects.toEqual({ statusCode: 401 });

      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });

  it('rethrows non-401 errors without refresh', async () => {
    await withApiContext(async ({ store, api }) => {
      store.accessToken = 'access-token';
      const refreshSpy = vi.spyOn(store, 'refresh').mockResolvedValue(false);
      refreshSpy.mockClear();
      const error = { statusCode: 500, message: 'fail' };
      apiFetchMock.mockRejectedValueOnce(error);

      await expect(api('/videos')).rejects.toEqual(error);

      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });
});
