import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import authClientPlugin from '~/plugins/auth.client';

const ensureSessionMock = vi.hoisted(() => vi.fn());
const useRouteMock = vi.hoisted(() =>
  vi.fn(() => ({
    path: '/',
    fullPath: '/',
    query: {},
  })),
);

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    ensureSession: ensureSessionMock,
  }),
}));

mockNuxtImport('useRoute', () => useRouteMock);

type NuxtPluginModule =
  | ((nuxt: ReturnType<typeof useNuxtApp>) => void | Promise<void>) |
  { setup?: (nuxt: ReturnType<typeof useNuxtApp>) => void | Promise<void> };

async function runAuthClientPlugin(): Promise<void> {
  const plugin = authClientPlugin as NuxtPluginModule;
  const nuxt = useNuxtApp();

  if (typeof plugin === 'function') {
    await plugin(nuxt);
    return;
  }

  if (plugin.setup) {
    await plugin.setup(nuxt);
  }
}

describe('auth.client plugin', () => {
  beforeEach(() => {
    ensureSessionMock.mockReset();
    ensureSessionMock.mockResolvedValue(false);
    useRouteMock.mockReturnValue({
      path: '/',
      fullPath: '/',
      query: {},
    });
  });

  it('hidrata store a partir de authUser SSR', async () => {
    const { mountSuspended } = await import('@nuxt/test-utils/runtime');

    await mountSuspended({
      async setup() {
        useAuthUser().value = {
          id: 'user-1',
          email: 'viewer@playplus.localhost',
          role: 'viewer',
          createdAt: '2025-01-01T00:00:00Z',
        };
        await runAuthClientPlugin();
      },
      template: '<div />',
    });

    const store = useAuthStore();
    expect(store.user?.email).toBe('viewer@playplus.localhost');
    expect(store.status).toBe('authenticated');
  });

  it('chama ensureSession quando há indício de sessão', async () => {
    ensureSessionMock.mockResolvedValue(true);

    const { mountSuspended } = await import('@nuxt/test-utils/runtime');

    await mountSuspended({
      async setup() {
        useAuthStore().user = {
          id: 'user-1',
          email: 'viewer@playplus.localhost',
          role: 'viewer',
          createdAt: '2025-01-01T00:00:00Z',
        };
        await runAuthClientPlugin();
      },
      template: '<div />',
    });

    expect(ensureSessionMock).toHaveBeenCalledOnce();
    expect(useAuthUser().value?.email).toBe('viewer@playplus.localhost');
  });

  it('retorna cedo quando já autenticado com access token', async () => {
    const { mountSuspended } = await import('@nuxt/test-utils/runtime');

    await mountSuspended({
      async setup() {
        useAuthStore().accessToken = 'token';
        await runAuthClientPlugin();
      },
      template: '<div />',
    });

    expect(ensureSessionMock).not.toHaveBeenCalled();
  });

  it('pula ensureSession em /login sem indício de sessão', async () => {
    useRouteMock.mockReturnValue({
      path: '/login',
      fullPath: '/login',
      query: {},
    });

    const { mountSuspended } = await import('@nuxt/test-utils/runtime');

    await mountSuspended({
      async setup() {
        useAuthStore().clearSession();
        useAuthUser().value = null;
        await runAuthClientPlugin();
      },
      template: '<div />',
    });

    expect(ensureSessionMock).not.toHaveBeenCalled();
  });
});
