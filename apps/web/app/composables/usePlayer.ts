import { ref, watch, onBeforeUnmount, type Ref, toValue } from 'vue';
import Hls from 'hls.js';
import { logger } from '~/utils/logger';

export function usePlayer(
  videoRef: Ref<HTMLVideoElement | null>,
  src: Ref<string | undefined> | (() => string | undefined) | string | undefined,
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
  let networkRetryCount = 0;
  let mediaRetryCount = 0;
  const MAX_RETRIES = 3;

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

    // Support check for Native HLS (like Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('audio/mpegurl')) {
      video.src = currentSrc;
    } else if (Hls.isSupported()) {
      // Support check for hls.js (Chrome, Firefox, etc.)
      hlsInstance = new Hls({ enableWorker: true });
      hlsInstance.loadSource(currentSrc);
      hlsInstance.attachMedia(video);

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
