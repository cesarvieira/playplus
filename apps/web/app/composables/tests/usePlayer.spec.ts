import { ref, createApp, defineComponent, nextTick } from 'vue';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import Hls from 'hls.js';
import { usePlayer } from '~/composables/usePlayer';

// Properly hoist the mocks so Vitest defines them before running the mock factory
const { mockHlsInstance, HlsMock } = vi.hoisted(() => {
  const instance = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    startLoad: vi.fn(),
    recoverMediaError: vi.fn(),
  };

  // Use a constructible function instead of class to avoid @typescript-eslint/no-extraneous-class
  function MockHls(this: unknown) {
    return instance;
  }

  // Base loader que o MediaTokenLoader estende (ADR-007).
  function BaseLoaderMock(this: unknown) {}
  BaseLoaderMock.prototype.load = vi.fn();
  BaseLoaderMock.prototype.abort = vi.fn();
  BaseLoaderMock.prototype.destroy = vi.fn();

  MockHls.isSupported = vi.fn().mockReturnValue(true);
  MockHls.DefaultConfig = { loader: BaseLoaderMock };
  MockHls.Events = {
    ERROR: 'hlsError',
  };
  MockHls.ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
  };

  return { mockHlsInstance: instance, HlsMock: MockHls as unknown as typeof Hls };
});

vi.mock('hls.js', () => {
  return { default: HlsMock };
});

function createMockVideo() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    src: '',
    canPlayType: vi.fn().mockReturnValue(''),
    addEventListener: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    }),
    removeEventListener: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
      }
    }),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
    load: vi.fn(),
    // Helper for tests to trigger event callbacks
    trigger: (event: string, ...args: unknown[]) => {
      if (listeners[event]) {
        listeners[event].forEach(cb => cb(...args));
      }
    },
  };
}

function withSetup<T>(composable: () => T) {
  let result: T | undefined;
  const app = createApp(
    defineComponent({
      setup() {
        result = composable();
        return () => null;
      },
    }),
  );
  const container = document.createElement('div');
  app.mount(container);
  return [result!, app] as const;
}

describe('usePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks zera chamadas mas não a implementação; garanta o default.
    (HlsMock.isSupported as Mock).mockReturnValue(true);
  });

  it('does not initialize if videoRef is null', async () => {
    const videoRef = ref<HTMLVideoElement | null>(null);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    expect(player.isBuffering.value).toBe(false);
    expect(player.isError.value).toBe(false);
  });

  it('initializes hls.js when native HLS is not supported', async () => {
    const video = createMockVideo() as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(video);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    expect(mockHlsInstance.loadSource).toHaveBeenCalledWith('http://example.com/stream.m3u8');
    expect(mockHlsInstance.attachMedia).toHaveBeenCalledWith(video);
    expect(player.isBuffering.value).toBe(true);
    expect(player.isError.value).toBe(false);
  });

  it('prefers hls.js over native HLS when MSE is supported', async () => {
    const video = createMockVideo();
    // Safari expõe HLS nativo, mas com MSE disponível preferimos hls.js (ADR-007).
    video.canPlayType.mockImplementation((type: string) => {
      return type === 'application/vnd.apple.mpegurl' ? 'maybe' : '';
    });
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    expect(mockHlsInstance.loadSource).toHaveBeenCalledWith('http://example.com/stream.m3u8');
    expect(videoElement.src).toBe('');
  });

  it('falls back to native HLS with token appended when MSE is unsupported (iOS)', async () => {
    (HlsMock.isSupported as Mock).mockReturnValue(false);
    const video = createMockVideo();
    video.canPlayType.mockImplementation((type: string) => {
      return type === 'application/vnd.apple.mpegurl' ? 'maybe' : '';
    });
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/videos/1/hls/master.m3u8?t=tok123');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    expect(videoElement.src).toBe('http://example.com/videos/1/hls/master.m3u8?t=tok123');
    expect(player.isBuffering.value).toBe(true);
  });

  it('manages buffering states via native event listeners', async () => {
    const video = createMockVideo();
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    // Start loading: buffering should be true
    expect(player.isBuffering.value).toBe(true);

    // Simulate playing: buffering becomes false
    video.trigger('playing');
    expect(player.isBuffering.value).toBe(false);

    // Simulate waiting: buffering becomes true
    video.trigger('waiting');
    expect(player.isBuffering.value).toBe(true);

    // Simulate canplay: buffering becomes false
    video.trigger('canplay');
    expect(player.isBuffering.value).toBe(false);
  });

  it('marks isError as true when video element throws error', async () => {
    const video = createMockVideo();
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    video.trigger('error', new Event('error'));
    expect(player.isError.value).toBe(true);
    expect(player.isBuffering.value).toBe(false);
  });

  it('retries HLS network error up to 3 times before setting fatal error', async () => {
    const video = createMockVideo();
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    // Get the error callback registered on Hls instance
    const errorCallback = (mockHlsInstance.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === Hls.Events.ERROR,
    )?.[1] as (event: string, data: { fatal: boolean; type: string }) => void;

    // Trigger non-fatal error: shouldn't set isError
    errorCallback('hlsError', { fatal: false, type: Hls.ErrorTypes.NETWORK_ERROR });
    expect(player.isError.value).toBe(false);

    // Trigger fatal network error 1
    errorCallback('hlsError', { fatal: true, type: Hls.ErrorTypes.NETWORK_ERROR });
    expect(player.isError.value).toBe(false);
    expect(mockHlsInstance.startLoad).toHaveBeenCalledTimes(1);

    // Trigger fatal network error 2
    errorCallback('hlsError', { fatal: true, type: Hls.ErrorTypes.NETWORK_ERROR });
    expect(player.isError.value).toBe(false);
    expect(mockHlsInstance.startLoad).toHaveBeenCalledTimes(2);

    // Trigger fatal network error 3
    errorCallback('hlsError', { fatal: true, type: Hls.ErrorTypes.NETWORK_ERROR });
    expect(player.isError.value).toBe(false);
    expect(mockHlsInstance.startLoad).toHaveBeenCalledTimes(3);

    // Trigger fatal network error 4 (exceeds MAX_RETRIES)
    errorCallback('hlsError', { fatal: true, type: Hls.ErrorTypes.NETWORK_ERROR });
    expect(player.isError.value).toBe(true);
    expect(player.isBuffering.value).toBe(false);
  });

  it('retries HLS media error up to 3 times before setting fatal error', async () => {
    const video = createMockVideo();
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    const errorCallback = (mockHlsInstance.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === Hls.Events.ERROR,
    )?.[1] as (event: string, data: { fatal: boolean; type: string }) => void;

    // Trigger fatal media errors
    for (let i = 0; i < 3; i++) {
      errorCallback('hlsError', { fatal: true, type: Hls.ErrorTypes.MEDIA_ERROR });
      expect(player.isError.value).toBe(false);
    }
    expect(mockHlsInstance.recoverMediaError).toHaveBeenCalledTimes(3);

    // Exceed retry limit
    errorCallback('hlsError', { fatal: true, type: Hls.ErrorTypes.MEDIA_ERROR });
    expect(player.isError.value).toBe(true);
  });

  it('triggers fatal error immediately on other HLS fatal error types', async () => {
    const video = createMockVideo();
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [player] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    const errorCallback = (mockHlsInstance.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === Hls.Events.ERROR,
    )?.[1] as (event: string, data: { fatal: boolean; type: string }) => void;

    errorCallback('hlsError', { fatal: true, type: 'OTHER_FATAL_ERROR' });
    expect(player.isError.value).toBe(true);
    expect(player.isBuffering.value).toBe(false);
  });

  it('destroys Hls instance and removes listeners on cleanup/unmount', async () => {
    const video = createMockVideo();
    const videoElement = video as unknown as HTMLVideoElement;
    const videoRef = ref<HTMLVideoElement | null>(videoElement);
    const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

    const [_, app] = withSetup(() => usePlayer(videoRef, srcRef));
    await nextTick();

    app.unmount();
    await nextTick();

    expect(mockHlsInstance.destroy).toHaveBeenCalled();
    expect(videoElement.removeAttribute).toHaveBeenCalledWith('src');
    expect(videoElement.load).toHaveBeenCalled();
    expect(videoElement.removeEventListener).toHaveBeenCalledWith('waiting', expect.any(Function));
  });

  describe('custom player controls and properties', () => {
    it('manages play, pause, ended and isPlaying states', async () => {
      const video = createMockVideo();
      const videoElement = video as unknown as HTMLVideoElement;
      const videoRef = ref<HTMLVideoElement | null>(videoElement);
      const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

      const [player] = withSetup(() => usePlayer(videoRef, srcRef));
      await nextTick();

      expect(player.isPlaying.value).toBe(false);

      video.trigger('play');
      expect(player.isPlaying.value).toBe(true);

      video.trigger('pause');
      expect(player.isPlaying.value).toBe(false);

      video.trigger('play');
      expect(player.isPlaying.value).toBe(true);

      video.trigger('ended');
      expect(player.isPlaying.value).toBe(false);
    });

    it('manages currentTime, duration and loadedmetadata states', async () => {
      const video = createMockVideo();
      const videoElement = video as unknown as HTMLVideoElement;
      const videoRef = ref<HTMLVideoElement | null>(videoElement);
      const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

      const [player] = withSetup(() => usePlayer(videoRef, srcRef));
      await nextTick();

      // Trigger durationchange
      (videoElement as unknown as { duration: number }).duration = 300;
      video.trigger('durationchange');
      expect(player.duration.value).toBe(300);

      // Trigger timeupdate
      videoElement.currentTime = 45;
      video.trigger('timeupdate');
      expect(player.currentTime.value).toBe(45);

      // Trigger loadedmetadata
      const mutableVideo = videoElement as unknown as { duration: number; videoHeight: number };
      mutableVideo.duration = 600;
      mutableVideo.videoHeight = 1080;
      video.trigger('loadedmetadata');
      expect(player.duration.value).toBe(600);
      expect(player.currentResolution.value).toBe('1080p · HD');
    });

    it('manages volume and isMuted states', async () => {
      const video = createMockVideo();
      const videoElement = video as unknown as HTMLVideoElement;
      const videoRef = ref<HTMLVideoElement | null>(videoElement);
      const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

      const [player] = withSetup(() => usePlayer(videoRef, srcRef));
      await nextTick();

      videoElement.volume = 0.5;
      videoElement.muted = false;
      video.trigger('volumechange');
      expect(player.volume.value).toBe(0.5);
      expect(player.isMuted.value).toBe(false);

      videoElement.muted = true;
      video.trigger('volumechange');
      expect(player.isMuted.value).toBe(true);
    });

    it('exposes seek, setVolume, toggleMute and toggleFullscreen', async () => {
      const video = createMockVideo();
      const videoElement = video as unknown as HTMLVideoElement;
      const videoRef = ref<HTMLVideoElement | null>(videoElement);
      const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

      const [player] = withSetup(() => usePlayer(videoRef, srcRef));
      await nextTick();

      (videoElement as unknown as { duration: number }).duration = 200;
      player.seek(50);
      expect(videoElement.currentTime).toBe(50);

      player.setVolume(0.8);
      expect(videoElement.volume).toBe(0.8);

      player.toggleMute();
      expect(videoElement.muted).toBe(true);
    });

    it('handles HLS level switching and updates resolution label', async () => {
      const video = createMockVideo();
      const videoElement = video as unknown as HTMLVideoElement;
      const videoRef = ref<HTMLVideoElement | null>(videoElement);
      const srcRef = ref<string | undefined>('http://example.com/stream.m3u8');

      const [player] = withSetup(() => usePlayer(videoRef, srcRef));
      await nextTick();

      const levelSwitchedCallback = (mockHlsInstance.on as Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'hlsLevelSwitched',
      )?.[1];

      expect(levelSwitchedCallback).toBeDefined();

      // Mock hlsInstance.levels
      (mockHlsInstance as unknown as { levels: { height: number }[] }).levels = [
        { height: 480 },
        { height: 720 },
        { height: 1080 },
      ];

      levelSwitchedCallback('hlsLevelSwitched', { level: 2 });
      expect(player.currentResolution.value).toBe('1080p · HD');

      levelSwitchedCallback('hlsLevelSwitched', { level: 0 });
      expect(player.currentResolution.value).toBe('480p · SD');
    });
  });
});
