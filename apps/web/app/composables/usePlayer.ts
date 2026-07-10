import { ref, watch, onBeforeUnmount, type Ref, toValue } from 'vue';
import Hls, { type LoaderContext, type LoaderConfiguration, type LoaderCallbacks } from 'hls.js';
import { logger } from '~/utils/logger';
import { appendMediaToken, extractMediaToken, getTokenExpiry } from '~/utils/media-token';

// Renovação do token de mídia (ADR-007): reemite antes de expirar para não
// quebrar a reprodução de vídeos mais longos que o TTL do token.
const TOKEN_REFRESH_SKEW_MS = 60_000;
const TOKEN_REFRESH_RETRY_MS = 15_000;

export interface UsePlayerOptions {
  /** Reemite um token de mídia fresco; `null` mantém o token atual. */
  refreshToken?: () => Promise<string | null>;
}

export function usePlayer(
  videoRef: Ref<HTMLVideoElement | null>,
  src: Ref<string | undefined> | (() => string | undefined) | string | undefined,
  options: UsePlayerOptions = {},
) {
  const isBuffering = ref(false);
  const isError = ref(false);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(1);
  const isMuted = ref(false);
  const isFullscreen = ref(false);
  const currentResolution = ref('Auto');

  const levels = ref<import('hls.js').Level[]>([]);
  const currentLevelIndex = ref<number>(-1);
  const nativeHeight = ref(0);

  let hlsInstance: Hls | null = null;
  let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  let networkRetryCount = 0;
  let mediaRetryCount = 0;
  const MAX_RETRIES = 3;

  function clearTokenRefresh() {
    if (tokenRefreshTimer !== null) {
      clearTimeout(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }
  }

  function handleWaiting() {
    isBuffering.value = true;
  }

  function handlePlaying() {
    isBuffering.value = false;
  }

  function handleVideoError(e: Event) {
    logger.error('Video element error:', e);
    isError.value = true;
    isBuffering.value = false;
  }

  function handlePlayEvent() {
    isPlaying.value = true;
  }

  function handlePauseEvent() {
    isPlaying.value = false;
  }

  function handleEndedEvent() {
    isPlaying.value = false;
  }

  function handleTimeUpdate() {
    if (videoRef.value) {
      currentTime.value = videoRef.value.currentTime;
    }
  }

  function handleDurationChange() {
    if (videoRef.value) {
      duration.value = videoRef.value.duration || 0;
    }
  }

  function handleLoadedMetadata() {
    if (videoRef.value) {
      duration.value = videoRef.value.duration || 0;
      nativeHeight.value = videoRef.value.videoHeight;
      updateResolutionLabel();
    }
  }

  function handleVolumeChange() {
    if (videoRef.value) {
      volume.value = videoRef.value.volume;
      isMuted.value = videoRef.value.muted;
    }
  }

  function handleResize() {
    if (videoRef.value) {
      nativeHeight.value = videoRef.value.videoHeight;
      updateResolutionLabel();
    }
  }

  function handleFullscreenChange() {
    const video = videoRef.value;
    if (!video) {
      isFullscreen.value = false;
      return;
    }
    const container = video.parentElement;
    isFullscreen.value =
      document.fullscreenElement !== null &&
      (document.fullscreenElement === container || document.fullscreenElement.contains(video));
  }

  function updateResolutionLabel() {
    if (hlsInstance && currentLevelIndex.value >= 0) {
      const level = hlsInstance.levels[currentLevelIndex.value];
      if (level) {
        const height = level.height;
        currentResolution.value = formatHeightToLabel(height);
        return;
      }
    }

    if (videoRef.value && videoRef.value.videoHeight > 0) {
      currentResolution.value = formatHeightToLabel(videoRef.value.videoHeight);
      return;
    }

    currentResolution.value = 'Auto';
  }

  function formatHeightToLabel(height: number): string {
    if (height >= 1080) return '1080p · HD';
    if (height >= 720) return '720p · HD';
    if (height >= 480) return '480p · SD';
    if (height >= 240) return '240p · SD';
    return `${height}p`;
  }

  function cleanup() {
    clearTokenRefresh();

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (import.meta.client) {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }

    const video = videoRef.value;
    if (video) {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handlePlaying);
      video.removeEventListener('seeking', handleWaiting);
      video.removeEventListener('seeked', handlePlaying);
      video.removeEventListener('error', handleVideoError);

      video.removeEventListener('play', handlePlayEvent);
      video.removeEventListener('pause', handlePauseEvent);
      video.removeEventListener('ended', handleEndedEvent);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('resize', handleResize);

      // Reset src securely
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // Ignored
      }
    }

    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    isFullscreen.value = false;
    currentResolution.value = 'Auto';
    levels.value = [];
    currentLevelIndex.value = -1;
  }

  function initPlayer() {
    cleanup();

    const video = videoRef.value;
    const currentSrc = toValue(src);

    if (!video || !currentSrc) {
      return;
    }

    isBuffering.value = true;
    isError.value = false;
    networkRetryCount = 0;
    mediaRetryCount = 0;

    // Attach event listeners to the video element
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handlePlaying);
    video.addEventListener('seeking', handleWaiting);
    video.addEventListener('seeked', handlePlaying);
    video.addEventListener('error', handleVideoError);

    video.addEventListener('play', handlePlayEvent);
    video.addEventListener('pause', handlePauseEvent);
    video.addEventListener('ended', handleEndedEvent);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('resize', handleResize);

    if (import.meta.client) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    // Set initial values safely
    currentTime.value = video.currentTime || 0;
    duration.value = video.duration || 0;
    volume.value = video.volume !== undefined ? video.volume : 1;
    isMuted.value = video.muted || false;
    isPlaying.value = video.paused === false;
    nativeHeight.value = video.videoHeight || 0;
    updateResolutionLabel();

    // Token de mídia (ADR-007): a stream_url chega assinada; o loader do hls.js
    // reanexa o token atual a cada playlist/segmento (URLs relativas perdem a query).
    // `mediaToken` é mutável — o refresh proativo o troca in-place antes de expirar.
    let mediaToken = extractMediaToken(currentSrc);

    async function refreshMediaToken(): Promise<void> {
      try {
        const next = await options.refreshToken?.();

        if (next) {
          mediaToken = next;
          scheduleTokenRefresh();
          return;
        }
      } catch (err) {
        logger.warn('Falha ao renovar token de mídia:', err);
      }

      // Sem token novo (falha ou vazio): tenta de novo dentro da janela de skew.
      tokenRefreshTimer = setTimeout(() => void refreshMediaToken(), TOKEN_REFRESH_RETRY_MS);
    }

    function scheduleTokenRefresh() {
      clearTokenRefresh();

      if (!options.refreshToken || !mediaToken) {
        return;
      }

      const expiry = getTokenExpiry(mediaToken);
      if (expiry === null) {
        return;
      }

      const delay = Math.max(0, expiry - Date.now() - TOKEN_REFRESH_SKEW_MS);
      tokenRefreshTimer = setTimeout(() => void refreshMediaToken(), delay);
    }

    // Preferimos hls.js (MSE) sempre que suportado — só ele consegue injetar o
    // token nos segmentos. HLS nativo (iOS Safari) fica como fallback; nele os
    // segmentos relativos não carregam o token (ver ADR-007, pendência iOS).
    if (Hls.isSupported()) {
      const BaseLoader = Hls.DefaultConfig.loader;

      hlsInstance = new Hls({
        enableWorker: true,
        loader: class MediaTokenLoader extends BaseLoader {
          override load(
            context: LoaderContext,
            config: LoaderConfiguration,
            callbacks: LoaderCallbacks<LoaderContext>,
          ): void {
            context.url = appendMediaToken(context.url, mediaToken);
            super.load(context, config, callbacks);
          }
        },
      });
      hlsInstance.loadSource(currentSrc);
      hlsInstance.attachMedia(video);

      // Renova o token antes de expirar (só o caminho hls.js propaga token nos
      // segmentos; HLS nativo/iOS segue como pendência do ADR-007).
      scheduleTokenRefresh();

      const manifestParsedEvent = Hls.Events?.MANIFEST_PARSED || 'hlsManifestParsed';
      const levelSwitchedEvent = Hls.Events?.LEVEL_SWITCHED || 'hlsLevelSwitched';

      hlsInstance.on(manifestParsedEvent, () => {
        levels.value = hlsInstance?.levels ?? [];
        updateResolutionLabel();
      });

      hlsInstance.on(levelSwitchedEvent, (_event, data) => {
        currentLevelIndex.value = data.level;
        updateResolutionLabel();
      });

      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCount < MAX_RETRIES) {
                networkRetryCount++;
                logger.warn(`HLS Network Error: Retrying load... (${networkRetryCount}/${MAX_RETRIES})`);
                hlsInstance?.startLoad();
              } else {
                logger.error('HLS Network Error: Max retries reached.');
                isError.value = true;
                isBuffering.value = false;
              }
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetryCount < MAX_RETRIES) {
                mediaRetryCount++;
                logger.warn(`HLS Media Error: Recovering... (${mediaRetryCount}/${MAX_RETRIES})`);
                hlsInstance?.recoverMediaError();
              } else {
                logger.error('HLS Media Error: Max retries reached.');
                isError.value = true;
                isBuffering.value = false;
              }
              break;

            default:
              logger.error('HLS Unrecoverable Error:', data);
              isError.value = true;
              isBuffering.value = false;
              cleanup();
              break;
          }
        }
      });
    } else if (
      video.canPlayType('application/vnd.apple.mpegurl') ||
      video.canPlayType('audio/mpegurl')
    ) {
      // HLS nativo (iOS Safari): fallback quando MSE não está disponível.
      video.src = appendMediaToken(currentSrc, mediaToken);
    } else {
      logger.error('HLS is not supported in this browser.');
      isError.value = true;
      isBuffering.value = false;
    }
  }

  async function play() {
    try {
      await videoRef.value?.play();
    } catch (err) {
      logger.error('Play failed:', err);
      if (videoRef.value) {
        logger.warn('Attempting muted autoplay fallback...');
        videoRef.value.muted = true;
        isMuted.value = true;
        try {
          await videoRef.value.play();
        } catch (fallbackErr) {
          logger.error('Muted autoplay fallback also failed:', fallbackErr);
        }
      }
    }
  }

  function pause() {
    videoRef.value?.pause();
  }

  function seek(time: number) {
    const video = videoRef.value;
    if (video) {
      video.currentTime = time;
      currentTime.value = time;
    }
  }

  function setVolume(value: number) {
    const video = videoRef.value;
    if (video) {
      const clamped = Math.max(0, Math.min(1, value));
      video.volume = clamped;
      if (clamped > 0) {
        video.muted = false;
      }
    }
  }

  function toggleMute() {
    const video = videoRef.value;
    if (video) {
      video.muted = !video.muted;
    }
  }

  async function toggleFullscreen(container?: HTMLElement | null) {
    const target = container || videoRef.value?.parentElement;
    if (!target) return;

    if (!document.fullscreenElement) {
      try {
        await target.requestFullscreen?.();
      } catch (err) {
        logger.error('Error enabling fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen?.();
      } catch (err) {
        logger.error('Error exiting fullscreen:', err);
      }
    }
  }

  function retry() {
    initPlayer();
  }

  watch(
    [videoRef, () => toValue(src)],
    () => {
      if (import.meta.client) {
        initPlayer();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    cleanup();
  });

  return {
    isBuffering,
    isError,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    currentResolution,
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
    retry,
  };
}
