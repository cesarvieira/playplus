import IndexPage from '~/pages/index.vue';
import { useAuthStore } from '~/stores/auth';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

const { apiFetchMock, navigateToMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  navigateToMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/utils/api-client', () => ({
  apiFetch: apiFetchMock,
}));

mockNuxtImport('navigateTo', () => navigateToMock);
mockNuxtImport('useRoute', () => () => ({
  fullPath: '/',
  path: '/',
  query: {},
}));

const sampleVideo = {
  id: 'video-1',
  title: 'Meu filme',
  duration: 7240,
  thumbnail_url: null,
  status: 'ready' as const,
  created_at: '2025-01-01T00:00:00.000Z',
};

async function mountIndexWithAuth() {
  return mountSuspended({
    components: { IndexPage },
    setup() {
      const authStore = useAuthStore();
      authStore.clearSession();
      authStore.accessToken = 'access-token';
    },
    template: '<IndexPage />',
    route: '/',
  });
}

describe('index page', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    navigateToMock.mockClear();
  });

  it('fetches ready videos on mount with default pagination', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [sampleVideo],
      meta: { total: 1, page: 1, limit: 20 },
    });

    await mountIndexWithAuth();
    await flushPromises();

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const path = apiFetchMock.mock.calls[0]?.[0] as string;
    expect(path).toContain('status=ready');
    expect(path).toContain('page=1');
    expect(path).toContain('limit=20');
  });

  it('renders title, subtitle and catalog grid on success', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [sampleVideo],
      meta: { total: 1, page: 1, limit: 20 },
    });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('Vídeos disponíveis');
    expect(wrapper.text()).toContain('1 vídeo');
    expect(wrapper.find('.pl-catalog-grid').exists()).toBe(true);
    expect(wrapper.find('a.pl-media-card').attributes('href')).toBe('/video-1');
  });

  it('renders plural subtitle when total is greater than one', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [sampleVideo, { ...sampleVideo, id: 'video-2', title: 'Outro filme' }],
      meta: { total: 6, page: 1, limit: 20 },
    });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('6 vídeos');
  });

  it('renders empty state when catalog has no videos', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 20 },
    });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('Nenhum vídeo disponível.');
    expect(wrapper.text()).toContain('Quando um vídeo terminar de processar, ele aparecerá aqui.');
    expect(wrapper.find('.pl-empty-state').exists()).toBe(true);
  });

  it('renders error alert and retries fetch on button click', async () => {
    apiFetchMock
      .mockRejectedValueOnce({
        statusCode: 500,
        data: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Falha ao listar vídeos',
          },
        },
      })
      .mockResolvedValueOnce({
        data: [sampleVideo],
        meta: { total: 1, page: 1, limit: 20 },
      });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('Falha ao listar vídeos');
    expect(wrapper.text()).toContain('Tentar novamente');

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.pl-catalog-grid').exists()).toBe(true);
  });

  it('shows pagination only when total exceeds limit', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [sampleVideo],
      meta: { total: 21, page: 1, limit: 20 },
    });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(wrapper.find('.pl-pagination').exists()).toBe(true);
  });

  it('hides pagination when total is within limit', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [sampleVideo],
      meta: { total: 20, page: 1, limit: 20 },
    });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(wrapper.find('.pl-pagination').exists()).toBe(false);
  });

  it('refetches when page changes', async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        data: [sampleVideo],
        meta: { total: 40, page: 1, limit: 20 },
      })
      .mockResolvedValueOnce({
        data: [{ ...sampleVideo, id: 'video-21', title: 'Página 2' }],
        meta: { total: 40, page: 2, limit: 20 },
      });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    const pageTwoButton = wrapper
      .findAll('.pl-pagination__btn')
      .find(button => button.text() === '2');

    expect(pageTwoButton).toBeDefined();
    await pageTwoButton!.trigger('click');
    await flushPromises();

    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    const secondPath = apiFetchMock.mock.calls[1]?.[0] as string;
    expect(secondPath).toContain('page=2');
    expect(wrapper.text()).toContain('Página 2');
  });

  it('shows loading skeleton while fetching', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    apiFetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(wrapper.find('.pl-catalog-grid--skeleton').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('0 vídeos');

    resolveFetch?.({
      data: [sampleVideo],
      meta: { total: 1, page: 1, limit: 20 },
    });
    await flushPromises();

    expect(wrapper.find('.pl-catalog-grid--skeleton').exists()).toBe(false);
    expect(wrapper.find('.pl-catalog-grid').exists()).toBe(true);
  });

  it('opens modal on video card click and navigates to play route when play is clicked', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [sampleVideo],
      meta: { total: 1, page: 1, limit: 20 },
    });

    const wrapper = await mountIndexWithAuth();
    await flushPromises();

    expect(document.querySelector('[role="dialog"]')).toBeNull();

    await wrapper.find('a.pl-media-card').trigger('click');
    await flushPromises();

    const modal = document.querySelector('[role="dialog"]');
    expect(modal).not.toBeNull();
    expect(modal!.textContent).toContain('Detalhes do Vídeo');
    expect(modal!.textContent).toContain(sampleVideo.title);
    expect(modal!.textContent).toContain('Duração: 2:00:40');

    const playBtn = modal!.querySelector('[aria-label="Reproduzir vídeo"]');
    expect(playBtn).not.toBeNull();
    playBtn!.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(navigateToMock).not.toHaveBeenCalled();

    // Espera os 350ms de transição da animação real
    await new Promise(resolve => setTimeout(resolve, 360));
    await flushPromises();

    expect(navigateToMock).toHaveBeenCalledWith('/video-1?play=true');
  });
});
