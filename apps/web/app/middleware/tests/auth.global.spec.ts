import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import authMiddleware from '~/middleware/auth.global';

const { navigateToMock, ensureSessionMock, ensureServerSessionMock, hasSessionCookieMock, requestEventRef } =
  vi.hoisted(() => ({
    navigateToMock: vi.fn().mockResolvedValue(undefined),
    ensureSessionMock: vi.fn(),
    ensureServerSessionMock: vi.fn(),
    hasSessionCookieMock: vi.fn(() => false),
    requestEventRef: {
      current: undefined as { context: Record<string, unknown> } | undefined,
    },
  }));

mockNuxtImport('navigateTo', () => navigateToMock);
mockNuxtImport('useRequestEvent', () => () => requestEventRef.current);

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    ensureSession: ensureSessionMock,
  }),
}));

vi.mock('~/utils/server-session.server', () => ({
  ensureServerSession: ensureServerSessionMock,
}));

vi.mock('~/utils/session-cookie', () => ({
  hasSessionCookie: hasSessionCookieMock,
}));

describe('auth.global middleware', () => {
  beforeEach(() => {
    navigateToMock.mockClear();
    ensureSessionMock.mockReset();
    ensureServerSessionMock.mockReset();
    ensureSessionMock.mockResolvedValue(false);
    ensureServerSessionMock.mockResolvedValue(null);
    hasSessionCookieMock.mockReturnValue(false);
    requestEventRef.current = undefined;
  });

  it('redirects unauthenticated client from protected route to login', async () => {
    await withMiddlewareContext(async () => {
      const authStore = useAuthStore();
      authStore.clearSession();

      await authMiddleware(
        { path: '/', fullPath: '/', query: {} } as never,
        { path: '/', fullPath: '/', query: {} } as never,
      );

      expect(navigateToMock).toHaveBeenCalledWith('/login?redirect=%2F');
    });
  });

  it('redirects authenticated user away from login to default home', async () => {
    await withMiddlewareContext(async () => {
      const authStore = useAuthStore();
      authStore.accessToken = 'token';

      await authMiddleware(
        { path: '/login', fullPath: '/login', query: {} } as never,
        { path: '/login', fullPath: '/login', query: {} } as never,
      );

      expect(navigateToMock).toHaveBeenCalledWith('/');
    });
  });

  it('honors safe redirect query when leaving login with active session', async () => {
    await withMiddlewareContext(async () => {
      ensureSessionMock.mockResolvedValue(true);

      await authMiddleware(
        { path: '/login', fullPath: '/login?redirect=%2Fabc123', query: { redirect: '/abc123' } } as never,
        { path: '/login', fullPath: '/login?redirect=%2Fabc123', query: { redirect: '/abc123' } } as never,
      );

      expect(navigateToMock).toHaveBeenCalledWith('/abc123');
    });
  });

  it('rejects open redirect on login bounce', async () => {
    await withMiddlewareContext(async () => {
      ensureSessionMock.mockResolvedValue(true);

      await authMiddleware(
        {
          path: '/login',
          fullPath: '/login?redirect=%2F%2Fevil.com',
          query: { redirect: '//evil.com' },
        } as never,
        {
          path: '/login',
          fullPath: '/login?redirect=%2F%2Fevil.com',
          query: { redirect: '//evil.com' },
        } as never,
      );

      expect(navigateToMock).toHaveBeenCalledWith('/');
    });
  });

  it('allows protected route during client hydration', async () => {
    await withMiddlewareContext(async () => {
      const authStore = useAuthStore();
      authStore.clearSession();
      useNuxtApp().isHydrating = true;

      await authMiddleware(
        { path: '/', fullPath: '/', query: {} } as never,
        { path: '/', fullPath: '/', query: {} } as never,
      );

      expect(navigateToMock).not.toHaveBeenCalled();
      expect(ensureSessionMock).not.toHaveBeenCalled();
    });
  });

  it('allows login page without session hint and without refresh', async () => {
    await withMiddlewareContext(async () => {
      useAuthStore().clearSession();
      useAuthUser().value = null;

      await authMiddleware(
        { path: '/login', fullPath: '/login', query: {} } as never,
        { path: '/login', fullPath: '/login', query: {} } as never,
      );

      expect(navigateToMock).not.toHaveBeenCalled();
      expect(ensureSessionMock).not.toHaveBeenCalled();
    });
  });

  it('allows protected route when ensureSession succeeds on client', async () => {
    ensureSessionMock.mockResolvedValue(true);

    await withMiddlewareContext(async () => {
      useAuthStore().clearSession();

      await authMiddleware(
        { path: '/', fullPath: '/', query: {} } as never,
        { path: '/', fullPath: '/', query: {} } as never,
      );

      expect(navigateToMock).not.toHaveBeenCalled();
      expect(ensureSessionMock).toHaveBeenCalledOnce();
    });
  });

  it('redirects protected route on server without session cookie', async () => {
    requestEventRef.current = { context: {} };
    hasSessionCookieMock.mockReturnValue(false);

    await withMiddlewareContext(async () => {
      await authMiddleware(
        { path: '/player/abc', fullPath: '/player/abc', query: {} } as never,
        { path: '/player/abc', fullPath: '/player/abc', query: {} } as never,
      );

      expect(navigateToMock).toHaveBeenCalledWith('/login?redirect=%2Fplayer%2Fabc');
    });
  });

  it('redirects protected route on server when session refresh falha', async () => {
    const event = { context: {} };
    requestEventRef.current = event;
    hasSessionCookieMock.mockReturnValue(true);
    ensureServerSessionMock.mockResolvedValue(null);

    await withMiddlewareContext(async () => {
      await authMiddleware(
        { path: '/catalog', fullPath: '/catalog', query: {} } as never,
        { path: '/catalog', fullPath: '/catalog', query: {} } as never,
      );

      expect(navigateToMock).toHaveBeenCalledWith('/login?redirect=%2Fcatalog');
    });
  });

  it('treats missing request event as unauthenticated on server', async () => {
    requestEventRef.current = undefined;

    await withMiddlewareContext(async () => {
      await authMiddleware(
        { path: '/', fullPath: '/', query: {} } as never,
        { path: '/', fullPath: '/', query: {} } as never,
      );

      expect(navigateToMock).toHaveBeenCalledWith('/login?redirect=%2F');
    });
  });
});

async function withMiddlewareContext(run: () => Promise<void>): Promise<void> {
  const { mountSuspended } = await import('@nuxt/test-utils/runtime');

  await mountSuspended({
    async setup() {
      useNuxtApp().isHydrating = false;
      await run();
    },
    template: '<div />',
  });
}
