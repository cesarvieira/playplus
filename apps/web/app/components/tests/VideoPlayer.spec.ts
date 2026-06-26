import { ref, nextTick } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import VideoPlayer from '~/components/VideoPlayer.vue';
import type { VideoDetail } from '~/composables/useVideoDetail';

const isBuffering = ref(false);
const isError = ref(false);
const playMock = vi.fn();
const pauseMock = vi.fn();
const retryMock = vi.fn();

vi.mock('~/composables/usePlayer', () => ({
  usePlayer: vi.fn().mockImplementation(() => ({
    isBuffering,
    isError,
    play: playMock,
    pause: pauseMock,
    retry: retryMock,
  })),
}));

const baseVideo: VideoDetail = {
  id: 'vid-123',
  title: 'Meu Filme Incrível',
  duration: 600,
  thumbnail_url: 'https://cdn.example.com/thumb.jpg',
  stream_url: 'https://cdn.example.com/stream.m3u8',
  status: 'ready',
  created_at: '2026-06-26T12:00:00.000Z',
};

async function mountVideoPlayer(video: VideoDetail = baseVideo) {
  return mountSuspended(VideoPlayer, {
    props: { video },
  });
}

describe('VideoPlayer', () => {
  beforeEach(() => {
    isBuffering.value = false;
    isError.value = false;
    vi.clearAllMocks();
  });

  it('renders video element with controls, playsinline, preload and poster', async () => {
    const wrapper = await mountVideoPlayer();
    const videoEl = wrapper.find('video');

    expect(videoEl.exists()).toBe(true);
    expect(videoEl.attributes('playsinline')).toBe('');
    expect(videoEl.attributes('preload')).toBe('metadata');
    expect(videoEl.attributes('controls')).toBe('');
    expect(videoEl.attributes('poster')).toBe(baseVideo.thumbnail_url);
    // Should not have the gradient class when thumbnail is present
    expect(videoEl.classes()).not.toContain('bg-linear-to-br');
  });

  it('shows gradient background on video element when thumbnail is not present', async () => {
    const wrapper = await mountVideoPlayer({
      ...baseVideo,
      thumbnail_url: null,
    });
    const videoEl = wrapper.find('video');

    expect(videoEl.attributes('poster')).toBeUndefined();
    expect(videoEl.classes()).toContain('bg-linear-to-br');
    expect(videoEl.classes()).toContain('from-[#3A2E5C]');
    expect(videoEl.classes()).toContain('via-[#5A4A86]');
    expect(videoEl.classes()).toContain('to-[#8A6FA8]');
  });

  it('does not display buffering or error overlays initially', async () => {
    const wrapper = await mountVideoPlayer();

    expect(wrapper.find('[data-testid="buffering-overlay"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="error-overlay"]').exists()).toBe(false);
  });

  it('displays buffering overlay when isBuffering is true', async () => {
    const wrapper = await mountVideoPlayer();

    isBuffering.value = true;
    await nextTick();

    const bufferingOverlay = wrapper.find('[data-testid="buffering-overlay"]');
    expect(bufferingOverlay.exists()).toBe(true);
    expect(bufferingOverlay.text()).toContain('Carregando...');
    expect(wrapper.find('[data-testid="error-overlay"]').exists()).toBe(false);
  });

  it('displays error overlay when isError is true', async () => {
    const wrapper = await mountVideoPlayer();

    isError.value = true;
    await nextTick();

    const errorOverlay = wrapper.find('[data-testid="error-overlay"]');
    expect(errorOverlay.exists()).toBe(true);
    expect(errorOverlay.text()).toContain('Não foi possível carregar o vídeo.');
    // Buffering overlay should be hidden even if isBuffering is true (error takes priority)
    isBuffering.value = true;
    await nextTick();
    expect(wrapper.find('[data-testid="buffering-overlay"]').exists()).toBe(false);
  });

  it('triggers usePlayer retry method when clicking Tentar Novamente', async () => {
    const wrapper = await mountVideoPlayer();

    isError.value = true;
    await nextTick();

    const retryBtn = wrapper.find('button');
    expect(retryBtn.exists()).toBe(true);

    await retryBtn.trigger('click');
    expect(retryMock).toHaveBeenCalledTimes(1);
  });
});
