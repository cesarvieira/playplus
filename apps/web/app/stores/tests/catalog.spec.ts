import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '~/stores/auth';
import { useCatalogStore } from '~/stores/catalog';

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

type CatalogStore = ReturnType<typeof useCatalogStore>;

const sampleVideo = {
  id: 'video-1',
  title: 'Meu filme',
  duration: 7240,
  thumbnail_url: null,
  status: 'ready' as const,
  created_at: '2025-01-01T00:00:00Z',
};

async function withCatalogStore<T>(run: (store: CatalogStore) => Promise<T>): Promise<T> {
  let store!: CatalogStore;

  await mountSuspended({
    setup() {
      const authStore = useAuthStore();
      authStore.clearSession();
      authStore.accessToken = 'access-token';
      store = useCatalogStore();
    },
    template: '<div />',
  });

  return run(store);
}

describe('useCatalogStore', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    navigateToMock.mockClear();
  });

  it('fetchReady populates data and meta on success', async () => {
    const response = {
      data: [sampleVideo],
      meta: { total: 1, page: 1, limit: 20 },
    };
    apiFetchMock.mockResolvedValueOnce(response);

    await withCatalogStore(async (store) => {
      await store.fetchReady();

      expect(store.data).toEqual([sampleVideo]);
      expect(store.meta).toEqual({ total: 1, page: 1, limit: 20 });
      expect(store.status).toBe('idle');
      expect(store.errorMessage).toBeNull();

      const path = apiFetchMock.mock.calls[0]?.[0] as string;
      expect(path).toContain('status=ready');
    });
  });

  it('fetchReady sets empty status when total is zero', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 20 },
    });

    await withCatalogStore(async (store) => {
      await store.fetchReady();

      expect(store.data).toEqual([]);
      expect(store.meta).toEqual({ total: 0, page: 1, limit: 20 });
      expect(store.status).toBe('empty');
    });
  });

  it('fetchReady preserves API error message', async () => {
    apiFetchMock.mockRejectedValueOnce({
      statusCode: 500,
      data: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Falha ao listar vídeos',
        },
      },
    });

    await withCatalogStore(async (store) => {
      await store.fetchReady();

      expect(store.status).toBe('error');
      expect(store.errorMessage).toBe('Falha ao listar vídeos');
    });
  });

  it('fetchReady uses generic message for network errors', async () => {
    apiFetchMock.mockRejectedValueOnce(new Error('network failed'));

    await withCatalogStore(async (store) => {
      await store.fetchReady();

      expect(store.status).toBe('error');
      expect(store.errorMessage).toBe('network failed');
    });
  });

  it('fetchReady uses fallback message for unknown errors', async () => {
    apiFetchMock.mockRejectedValueOnce({ statusCode: 500 });

    await withCatalogStore(async (store) => {
      await store.fetchReady();

      expect(store.status).toBe('error');
      expect(store.errorMessage).toBe('Ocorreu um erro.');
    });
  });

  it('fetchReady preserves previous data on error', async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        data: [sampleVideo],
        meta: { total: 1, page: 1, limit: 20 },
      })
      .mockRejectedValueOnce({
        statusCode: 500,
        data: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Falha ao listar vídeos',
          },
        },
      });

    await withCatalogStore(async (store) => {
      await store.fetchReady();
      await store.fetchReady();

      expect(store.data).toEqual([sampleVideo]);
      expect(store.meta).toEqual({ total: 1, page: 1, limit: 20 });
      expect(store.status).toBe('error');
    });
  });

  it('fetchReady sends pagination query params', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 2, limit: 10 },
    });

    await withCatalogStore(async (store) => {
      await store.fetchReady(2, 10);

      expect(apiFetchMock).toHaveBeenCalledWith(
        '/videos?status=ready&page=2&limit=10',
        expect.any(Object),
      );
      expect(store.meta).toEqual({ total: 0, page: 2, limit: 10 });
    });
  });
});
