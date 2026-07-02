import VideoDetailPage from '~/pages/[id].vue';
import { useAuthStore } from '~/stores/auth';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, navigateToMock, routeQueryMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  navigateToMock: vi.fn().mockResolvedValue(undefined),
  routeQueryMock: {} as Record<string, string>,
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRoute: () => ({
      params: { id: 'video-123' },
      fullPath: '/video-123',
      path: '/video-123',
      query: routeQueryMock,
    }),
  };
});

vi.mock('~/components/VideoPlayer.vue', () => ({
  default: {
    name: 'VideoPlayer',
    props: ['video', 'autoplay'],
    template: '<div class="video-player-stub" :data-autoplay="autoplay">[VideoPlayer Stub - {{ video.title }}]</div>',
  },
}));

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

vi.mock('~/utils/api-client', () => ({
  apiFetch: apiFetchMock,
}));

mockNuxtImport('navigateTo', () => navigateToMock);

async function mountPageWithAuth() {
  return mountSuspended({
    components: { VideoDetailPage },
    setup() {
      const authStore = useAuthStore();
      authStore.clearSession();
      authStore.accessToken = 'access-token';
    },
    template: '<VideoDetailPage />',
    route: '/video-123',
  });
}

describe('[id] video detail page', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    navigateToMock.mockClear();
  });

  it('renders loading state initially', async () => {
    apiFetchMock.mockImplementationOnce(() => new Promise(() => { /* do nothing */ }));
    const wrapper = await mountPageWithAuth();
    expect(wrapper.text()).toContain('Carregando vídeo...');
    expect(wrapper.find('.pl-spinner').exists()).toBe(true);
  });

  it('renders ready state with player and metadata', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'video-123',
      title: 'Filme pronto',
      duration: 3600,
      thumbnail_url: null,
      status: 'ready',
      created_at: '2025-01-01T12:00:00.000Z',
    });

    const wrapper = await mountPageWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('Filme pronto');
    expect(wrapper.text()).toContain('1 jan 2025 · 1:00:00');
    expect(wrapper.text()).toContain('[VideoPlayer Stub - Filme pronto]');
  });

  it('renders unavailable processing status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'video-123',
      title: 'Filme processando',
      duration: null,
      thumbnail_url: null,
      status: 'processing',
      created_at: '2025-01-01T12:00:00.000Z',
    });

    const wrapper = await mountPageWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('Este vídeo ainda está sendo preparado.');
    expect(wrapper.text()).toContain('Filme processando');
  });

  it('renders unavailable queued status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'video-123',
      title: 'Filme na fila',
      duration: null,
      thumbnail_url: null,
      status: 'queued',
      created_at: '2025-01-01T12:00:00.000Z',
    });

    const wrapper = await mountPageWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('Este vídeo está na fila de processamento.');
    expect(wrapper.text()).toContain('Filme na fila');
  });

  it('renders not found page when API throws 404', async () => {
    apiFetchMock.mockRejectedValueOnce({ statusCode: 404 });

    const wrapper = await mountPageWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('404');
    expect(wrapper.text()).toContain('Essa sessão não está em cartaz.');
  });

  it('renders error block with retry button on API failure', async () => {
    apiFetchMock.mockRejectedValueOnce({
      statusCode: 500,
      data: { error: { code: 'INTERNAL_ERROR', message: 'API failed' } },
    });

    const wrapper = await mountPageWithAuth();
    await flushPromises();

    expect(wrapper.text()).toContain('API failed');
    expect(wrapper.text()).toContain('Tentar novamente');
  });

  it('renders fullscreen player and passes autoplay when query play is true', async () => {
    Object.assign(routeQueryMock, { play: 'true' });
    apiFetchMock.mockResolvedValueOnce({
      id: 'video-123',
      title: 'Filme pronto',
      duration: 3600,
      thumbnail_url: null,
      status: 'ready',
      created_at: '2025-01-01T12:00:00.000Z',
    });

    const wrapper = await mountPageWithAuth();
    await flushPromises();

    const playerContainer = wrapper.find('.fixed.inset-0.z-50');
    expect(playerContainer.exists()).toBe(true);
    expect(playerContainer.classes()).toContain('w-screen');
    expect(playerContainer.classes()).toContain('h-screen');
    expect(playerContainer.classes()).toContain('bg-black');

    const stub = wrapper.find('.video-player-stub');
    expect(stub.exists()).toBe(true);
    expect(stub.attributes('data-autoplay')).toBe('true');

    delete routeQueryMock.play;
  });
});
