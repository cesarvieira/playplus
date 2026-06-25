import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withAuth } from '~/test-utils/auth.harness';

const { ofetchMock, navigateToMock } = vi.hoisted(() => ({
  ofetchMock: vi.fn(),
  navigateToMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('ofetch', () => ({
  ofetch: ofetchMock,
}));

mockNuxtImport('navigateTo', () => navigateToMock);

const meResponse = {
  id: 'user-1',
  email: 'viewer@playplus.localhost',
  role: 'viewer' as const,
  created_at: '2025-01-01T00:00:00Z',
};

function mockLoginSuccess() {
  ofetchMock
    .mockResolvedValueOnce({ access_token: 'access-token', expires_in: 900 })
    .mockResolvedValueOnce(meResponse);
}

describe('useAuth', () => {
  beforeEach(() => {
    ofetchMock.mockReset();
    navigateToMock.mockClear();
  });

  it('login delegates to store and redirects to default path', async () => {
    mockLoginSuccess();

    await withAuth(async (auth) => {
      await auth.login('viewer@playplus.localhost', 'secret');

      expect(navigateToMock).toHaveBeenCalledWith('/');
      expect(auth.isAuthenticated.value).toBe(true);
      expect(auth.user.value?.email).toBe('viewer@playplus.localhost');
    });
  });

  it('login honors safe redirect query', async () => {
    mockLoginSuccess();

    await withAuth(async (auth) => {
      await auth.login('viewer@playplus.localhost', 'secret', { redirect: '/abc123' });

      expect(navigateToMock).toHaveBeenCalledWith('/abc123');
    });
  });

  it('logout clears session and navigates to login', async () => {
    mockLoginSuccess();
    ofetchMock.mockResolvedValueOnce(undefined);

    await withAuth(async (auth) => {
      await auth.login('viewer@playplus.localhost', 'secret');
      await auth.logout();

      expect(navigateToMock).toHaveBeenLastCalledWith('/login');
      expect(auth.isAuthenticated.value).toBe(false);
    });
  });

  it('ensureSession returns true when already authenticated', async () => {
    mockLoginSuccess();

    await withAuth(async (auth) => {
      await auth.login('viewer@playplus.localhost', 'secret');

      const result = await auth.ensureSession();

      expect(result).toBe(true);
      expect(ofetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it('ensureSession attempts refresh when unauthenticated', async () => {
    ofetchMock
      .mockResolvedValueOnce({ access_token: 'refreshed', expires_in: 900 })
      .mockResolvedValueOnce(meResponse);

    await withAuth(async (auth) => {
      const result = await auth.ensureSession();

      expect(result).toBe(true);
      expect(auth.isAuthenticated.value).toBe(true);
    });
  });

  it('exposes loading state during login', async () => {
    let resolveLogin: ((value: unknown) => void) | undefined;
    ofetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    await withAuth(async (auth) => {
      const pending = auth.login('viewer@playplus.localhost', 'secret');

      expect(auth.isLoading.value).toBe(true);

      resolveLogin?.({ access_token: 'access-token', expires_in: 900 });
      ofetchMock.mockResolvedValueOnce(meResponse);
      await pending;

      expect(auth.isLoading.value).toBe(false);
    });
  });
});
