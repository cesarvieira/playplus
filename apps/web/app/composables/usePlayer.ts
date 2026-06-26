import { ref, watch, onBeforeUnmount, type Ref, toValue } from 'vue';
import Hls from 'hls.js';
import { logger } from '~/utils/logger';

export function usePlayer(
  videoRef: Ref<HTMLVideoElement | null>,
  src: Ref<string | undefined> | (() => string | undefined) | string | undefined,
) {
  const isBuffering = ref(false);
  const isError = ref(false);
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

  function cleanup() {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    const video = videoRef.value;
    if (video) {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handlePlaying);
      video.removeEventListener('seeking', handleWaiting);
      video.removeEventListener('seeked', handlePlaying);
      video.removeEventListener('error', handleVideoError);

      // Reset src securely
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // Ignored
      }
    }
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

    // Support check for Native HLS (like Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('audio/mpegurl')) {
      video.src = currentSrc;
    } else if (Hls.isSupported()) {
      // Support check for hls.js (Chrome, Firefox, etc.)
      hlsInstance = new Hls({ enableWorker: true });
      hlsInstance.loadSource(currentSrc);
      hlsInstance.attachMedia(video);

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
    play,
    pause,
    retry,
  };
}
