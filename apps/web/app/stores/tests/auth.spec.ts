import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withAuthStore } from '~/test-utils/auth.harness';

const { ofetchMock } = vi.hoisted(() => ({
  ofetchMock: vi.fn(),
}));

vi.mock('ofetch', () => ({
  ofetch: ofetchMock,
}));

const meResponse = {
  id: 'user-1',
  email: 'viewer@playplus.localhost',
  role: 'viewer' as const,
  created_at: '2025-01-01T00:00:00Z',
};

function mockLoginSuccess(token = 'access-token') {
  ofetchMock
    .mockResolvedValueOnce({ access_token: token, expires_in: 900 })
    .mockResolvedValueOnce(meResponse);
}

describe('useAuthStore', () => {
  beforeEach(() => {
    ofetchMock.mockReset();
  });

  it('login stores token in memory and loads user profile', async () => {
    mockLoginSuccess();

    await withAuthStore(async (store) => {
      await store.login({ email: 'viewer@playplus.localhost', password: 'secret' });

      expect(store.accessToken).toBe('access-token');
      expect(store.user).toEqual({
        id: 'user-1',
        email: 'viewer@playplus.localhost',
        role: 'viewer',
        createdAt: '2025-01-01T00:00:00Z',
      });
      expect(store.status).toBe('authenticated');
      expect(store.isAuthenticated).toBe(true);
      expect(ofetchMock).toHaveBeenNthCalledWith(
        1,
        '/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: { email: 'viewer@playplus.localhost', password: 'secret' },
        }),
      );
    });
  });

  it('login clears session and rethrows on failure', async () => {
    const error = new Error('invalid credentials');
    ofetchMock.mockRejectedValueOnce(error);

    await withAuthStore(async (store) => {
      store.accessToken = 'stale';

      await expect(
        store.login({ email: 'viewer@playplus.localhost', password: 'wrong' }),
      ).rejects.toThrow('invalid credentials');

      expect(store.accessToken).toBeNull();
      expect(store.user).toBeNull();
      expect(store.status).toBe('idle');
    });
  });

  it('refresh loads user when session had token but no profile', async () => {
    ofetchMock
      .mockResolvedValueOnce({ access_token: 'refreshed', expires_in: 900 })
      .mockResolvedValueOnce(meResponse);

    await withAuthStore(async (store) => {
      const result = await store.refresh();

      expect(result).toBe(true);
      expect(store.accessToken).toBe('refreshed');
      expect(store.user?.email).toBe('viewer@playplus.localhost');
      expect(ofetchMock).toHaveBeenCalledWith(
        '/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });
  });

  it('refresh keeps existing user and skips fetchMe', async () => {
    ofetchMock.mockResolvedValueOnce({ access_token: 'refreshed', expires_in: 900 });

    await withAuthStore(async (store) => {
      store.user = {
        id: 'user-1',
        email: 'viewer@playplus.localhost',
        role: 'viewer',
        createdAt: '2025-01-01T00:00:00Z',
      };

      const result = await store.refresh();

      expect(result).toBe(true);
      expect(store.status).toBe('authenticated');
      expect(ofetchMock).toHaveBeenCalledOnce();
    });
  });

  it('refresh clears session and returns false on failure', async () => {
    ofetchMock.mockRejectedValueOnce(new Error('invalid refresh'));

    await withAuthStore(async (store) => {
      store.accessToken = 'expired';

      const result = await store.refresh();

      expect(result).toBe(false);
      expect(store.accessToken).toBeNull();
      expect(store.status).toBe('idle');
    });
  });

  it('deduplicates concurrent refresh calls', async () => {
    let resolveRefresh: ((value: unknown) => void) | undefined;
    ofetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    await withAuthStore(async (store) => {
      const first = store.refresh();
      const second = store.refresh();

      resolveRefresh?.({ access_token: 'shared', expires_in: 900 });
      store.user = {
        id: 'user-1',
        email: 'viewer@playplus.localhost',
        role: 'viewer',
        createdAt: '2025-01-01T00:00:00Z',
      };

      await Promise.all([first, second]);

      expect(ofetchMock).toHaveBeenCalledOnce();
    });
  });

  it('logout revokes session on API and clears local state', async () => {
    ofetchMock.mockResolvedValueOnce(undefined);

    await withAuthStore(async (store) => {
      store.accessToken = 'access-token';
      store.user = {
        id: 'user-1',
        email: 'viewer@playplus.localhost',
        role: 'viewer',
        createdAt: '2025-01-01T00:00:00Z',
      };

      await store.logout();

      expect(ofetchMock).toHaveBeenCalledWith(
        '/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: 'Bearer access-token' },
        }),
      );
      expect(store.accessToken).toBeNull();
      expect(store.user).toBeNull();
    });
  });

  it('logout clears local state even when API call fails', async () => {
    ofetchMock.mockRejectedValueOnce(new Error('network'));

    await withAuthStore(async (store) => {
      store.accessToken = 'access-token';

      await expect(store.logout()).rejects.toThrow('network');

      expect(store.accessToken).toBeNull();
      expect(store.status).toBe('idle');
    });
  });

  it('logout omits Authorization header when token is absent', async () => {
    ofetchMock.mockResolvedValueOnce(undefined);

    await withAuthStore(async (store) => {
      await store.logout();

      expect(ofetchMock).toHaveBeenCalledWith(
        '/auth/logout',
        expect.objectContaining({
          headers: undefined,
        }),
      );
    });
  });

  it('clearSession resets auth state', async () => {
    await withAuthStore(async (store) => {
      store.accessToken = 'token';
      store.user = {
        id: 'user-1',
        email: 'viewer@playplus.localhost',
        role: 'viewer',
        createdAt: '2025-01-01T00:00:00Z',
      };
      store.status = 'authenticated';

      store.clearSession();

      expect(store.accessToken).toBeNull();
      expect(store.user).toBeNull();
      expect(store.status).toBe('idle');
    });
  });
});
