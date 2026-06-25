import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import authHydrationPlugin from '~/plugins/auth-hydration.server';

const hasSessionCookieMock = vi.hoisted(() => vi.fn());
const ensureServerSessionMock = vi.hoisted(() => vi.fn());
const serverApiFetchMock = vi.hoisted(() => vi.fn());
const requestEventRef = vi.hoisted(() => ({
  current: undefined as { context: Record<string, unknown> } | undefined,
}));

mockNuxtImport('useRequestEvent', () => () => requestEventRef.current);

vi.mock('~/utils/session-cookie', () => ({
  hasSessionCookie: hasSessionCookieMock,
}));

vi.mock('~/utils/server-session.server', () => ({
  ensureServerSession: ensureServerSessionMock,
}));

vi.mock('~/utils/api-client.server', () => ({
  serverApiFetch: serverApiFetchMock,
}));

type NuxtPluginModule =
  | ((nuxt: ReturnType<typeof useNuxtApp>) => void | Promise<void>) |
  { setup?: (nuxt: ReturnType<typeof useNuxtApp>) => void | Promise<void> };

async function runAuthHydrationPlugin(): Promise<void> {
  const plugin = authHydrationPlugin as NuxtPluginModule;
  const nuxt = useNuxtApp();

  if (typeof plugin === 'function') {
    await plugin(nuxt);
    return;
  }

  if (plugin.setup) {
    await plugin.setup(nuxt);
  }
}

function resetAuthState(): void {
  useAuthStore().clearSession();
  useAuthUser().value = null;
}

describe('auth-hydration.server plugin', () => {
  beforeEach(() => {
    hasSessionCookieMock.mockReset();
    ensureServerSessionMock.mockReset();
    serverApiFetchMock.mockReset();
    hasSessionCookieMock.mockReturnValue(false);
    ensureServerSessionMock.mockResolvedValue(null);
    requestEventRef.current = undefined;
  });

  it('ignora quando authUser já está preenchido', async () => {
    const { mountSuspended } = await import('@nuxt/test-utils/runtime');

    await mountSuspended({
      async setup() {
        resetAuthState();
        useAuthUser().value = {
          id: 'user-1',
          email: 'viewer@playplus.localhost',
          role: USER_ROLE.VIEWER,
          createdAt: '2025-01-01T00:00:00Z',
        };
        await runAuthHydrationPlugin();
        expect(serverApiFetchMock).not.toHaveBeenCalled();
      },
      template: '<div />',
    });
  });

  it('hidrata authUser e store quando cookie e sessão são válidos', async () => {
    const { mountSuspended } = await import('@nuxt/test-utils/runtime');
    const event = { context: {} };

    hasSessionCookieMock.mockReturnValue(true);
    ensureServerSessionMock.mockResolvedValue({
      userId: 'user-1',
      role: USER_ROLE.VIEWER,
      exp: 9999999999,
    });
    serverApiFetchMock.mockResolvedValue({
      id: 'user-1',
      email: 'viewer@playplus.localhost',
      role: USER_ROLE.VIEWER,
      created_at: '2025-01-01T00:00:00Z',
    });

    await mountSuspended({
      async setup() {
        resetAuthState();
        requestEventRef.current = event;
        await runAuthHydrationPlugin();

        expect(useAuthUser().value?.email).toBe('viewer@playplus.localhost');
        expect(useAuthStore().user?.email).toBe('viewer@playplus.localhost');
        expect(useAuthStore().status).toBe('authenticated');
      },
      template: '<div />',
    });
  });

  it('não hidrata quando ensureServerSession falha', async () => {
    const { mountSuspended } = await import('@nuxt/test-utils/runtime');
    const event = { context: {} };

    hasSessionCookieMock.mockReturnValue(true);
    ensureServerSessionMock.mockResolvedValue(null);

    await mountSuspended({
      async setup() {
        resetAuthState();
        requestEventRef.current = event;
        await runAuthHydrationPlugin();

        expect(serverApiFetchMock).not.toHaveBeenCalled();
        expect(useAuthUser().value).toBeNull();
      },
      template: '<div />',
    });
  });

  it('ignora falha ao buscar /me após sessão válida', async () => {
    const { mountSuspended } = await import('@nuxt/test-utils/runtime');
    const event = { context: {} };

    hasSessionCookieMock.mockReturnValue(true);
    ensureServerSessionMock.mockResolvedValue({
      userId: 'user-1',
      role: USER_ROLE.VIEWER,
      exp: 9999999999,
    });
    serverApiFetchMock.mockRejectedValue(new Error('api down'));

    await mountSuspended({
      async setup() {
        resetAuthState();
        requestEventRef.current = event;
        await runAuthHydrationPlugin();

        expect(useAuthUser().value).toBeNull();
      },
      template: '<div />',
    });
  });
});
