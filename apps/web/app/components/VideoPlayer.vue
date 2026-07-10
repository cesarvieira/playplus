<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import PlayLogo from '~/components/PlayLogo.vue';
import type { VideoDetail } from '~/composables/useVideoDetail';
import { usePlayer } from '~/composables/usePlayer';
import { useApi } from '~/composables/useApi';
import PlayerControls from '~/components/PlayerControls.vue';

const props = withDefaults(
  defineProps<{
    video: VideoDetail;
    autoplay?: boolean;
  }>(),
  {
    autoplay: false,
  },
);

const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const streamUrl = computed(() => props.video.stream_url);

const { api } = useApi();

// Renovação do token de mídia (ADR-007): reemite via API antes de expirar.
async function refreshMediaToken(): Promise<string | null> {
  try {
    const { token } = await api<{ token: string; expires_in: number }>(
      `/videos/${props.video.id}/media-token`,
    );
    return token;
  } catch {
    return null;
  }
}

const {
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
} = usePlayer(videoRef, streamUrl, { refreshToken: refreshMediaToken });

const showControls = ref(true);
let hideTimeout: NodeJS.Timeout | null = null;

function resetHideTimeout() {
  showControls.value = true;
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  if (isPlaying.value) {
    hideTimeout = setTimeout(() => {
      showControls.value = false;
    }, 2500);
  }
}

watch(isPlaying, () => {
  resetHideTimeout();
});

function handleMouseMove() {
  resetHideTimeout();
}

function handleMouseLeave() {
  if (isPlaying.value) {
    showControls.value = false;
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const activeTag = document.activeElement?.tagName.toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea') return;

  const key = event.key.toLowerCase();

  if (key === ' ' || key === 'k') {
    // Standard accessibility behavior: do not override space if a button is focused
    if (
      key === ' ' &&
      (
        document.activeElement?.tagName.toLowerCase() === 'button' ||
        document.activeElement?.getAttribute('role') === 'button'
      )
    ) {
      return;
    }
    event.preventDefault();
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
    resetHideTimeout();
  } else if (key === 'f') {
    event.preventDefault();
    toggleFullscreen(containerRef.value);
    resetHideTimeout();
  } else if (key === 'arrowright') {
    event.preventDefault();
    seek(Math.min(duration.value, currentTime.value + 10));
    resetHideTimeout();
  } else if (key === 'arrowleft') {
    event.preventDefault();
    seek(Math.max(0, currentTime.value - 10));
    resetHideTimeout();
  }
}

onMounted(() => {
  resetHideTimeout();
});

watch(
  [isBuffering, isError],
  ([buffering, error]) => {
    if (!buffering && !error && props.autoplay && !isPlaying.value) {
      void play();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
});
</script>

<template>
  <div
    ref="containerRef"
    tabindex="0"
    class="relative w-full h-full bg-black aspect-video overflow-hidden group outline-hidden"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @keydown="handleKeyDown"
  >
    <!-- The Video Element (click to toggle play/pause) -->
    <video
      ref="videoRef"
      :poster="video.thumbnail_url || undefined"
      playsinline
      preload="metadata"
      class="absolute inset-0 w-full h-full object-contain z-0 cursor-pointer bg-black"
      @click="isPlaying ? pause() : play()"
    ></video>

    <!-- Header Overlay (visible on hover, mouse move or when paused/buffering/error) -->
    <header
      class="absolute top-0 left-0 right-0 p-6 z-10 flex items-center justify-between bg-linear-to-b from-black/80 to-transparent transition-opacity duration-300"
      :class="{
        'opacity-100': showControls || !isPlaying || isBuffering || isError,
        'opacity-0 pointer-events-none': !showControls && isPlaying && !isBuffering && !isError
      }"
    >
      <div class="flex items-center gap-3">
        <PlayLogo size="sm" />
        <span class="text-pl-sm font-extrabold tracking-pl-tight text-night-text select-none">Play+</span>
        <span
          v-if="currentResolution && currentResolution !== 'Auto'"
          class="px-2.5 py-0.5 text-pl-2xs font-mono font-bold bg-night-surface/75 border border-night-border-panel/40 rounded-full text-night-subtle tracking-wider select-none"
          data-testid="quality-badge"
        >
          {{ currentResolution }}
        </span>
      </div>
      <NuxtLink
        to="/"
        class="text-pl-xs font-bold text-night-subtle hover:text-night-text transition-colors pl-focus-ring"
      >
        Voltar aos vídeos
      </NuxtLink>
    </header>

    <!-- Central Play FAB Overlay (visible on idle/pause) -->
    <div
      v-if="!isPlaying && !isBuffering && !isError"
      class="absolute inset-0 flex items-center justify-center bg-black/25 z-10 pointer-events-none"
    >
      <button
        type="button"
        class="size-16 rounded-full bg-cta-gradient flex items-center justify-center text-night-ink shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 pl-focus-ring cursor-pointer pointer-events-auto"
        aria-label="Reproduzir"
        data-testid="central-play-btn"
        @click="play"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="translate-x-px"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>

    <!-- Buffering Overlay -->
    <div
      v-if="isBuffering && !isError"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-20 pointer-events-none"
      data-testid="buffering-overlay"
    >
      <span
        class="pl-spinner size-pl-icon-md"
        aria-hidden="true"
      ></span>
      <span class="text-pl-sm font-semibold text-night-text select-none">Carregando...</span>
    </div>

    <!-- Error Overlay -->
    <div
      v-if="isError"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-night-panel/95 z-30 p-6 text-center"
      data-testid="error-overlay"
    >
      <PlAlert
        variant="error"
        :dismissible="false"
        class="max-w-md"
      >
        Não foi possível carregar o vídeo.
      </PlAlert>
      <PlButton
        variant="secondary"
        @click="retry"
      >
        Tentar novamente
      </PlButton>
    </div>

    <!-- Custom Bottom Controls Overlay -->
    <PlayerControls
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="duration"
      :volume="volume"
      :is-muted="isMuted"
      :is-fullscreen="isFullscreen"
      class="transition-opacity duration-300"
      :class="{
        'opacity-100': showControls || !isPlaying || isBuffering || isError,
        'opacity-0 pointer-events-none': !showControls && isPlaying && !isBuffering && !isError
      }"
      @play="play"
      @pause="pause"
      @seek="seek"
      @set-volume="setVolume"
      @toggle-mute="toggleMute"
      @toggle-fullscreen="toggleFullscreen(containerRef)"
    />
  </div>
</template>
