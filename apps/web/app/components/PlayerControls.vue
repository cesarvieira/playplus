<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
}>();

const emit = defineEmits<{
  (e: 'play' | 'pause' | 'toggleMute' | 'toggleFullscreen'): void;
  (e: 'seek' | 'setVolume', value: number): void;
}>();

function formatTime(totalSeconds: number): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

const formattedCurrentTime = computed(() => formatTime(props.currentTime));
const formattedDuration = computed(() => formatTime(props.duration));

function onVolumeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  emit('setVolume', parseFloat(input.value));
}
</script>

<template>
  <div
    class="absolute bottom-0 left-0 right-0 z-10 p-4 pt-10 bg-linear-to-t from-black/95 via-black/40 to-transparent flex flex-col gap-3"
    data-testid="player-controls"
  >
    <!-- Row 1: Scrubber -->
    <PlayerScrubber
      :current-time="currentTime"
      :duration="duration"
      @seek="(time) => emit('seek', time)"
    />

    <!-- Row 2: Control Buttons -->
    <div class="flex items-center justify-between">
      <!-- Left Controls: Play/Pause, Volume, Time -->
      <div class="flex items-center gap-4">
        <!-- Play/Pause Toggle -->
        <button
          type="button"
          class="text-night-text hover:text-night-accent transition-colors p-1.5 rounded-full hover:bg-white/10 outline-hidden pl-focus-ring cursor-pointer"
          :aria-label="isPlaying ? 'Pausar' : 'Reproduzir'"
          data-testid="play-pause-btn"
          @click="isPlaying ? emit('pause') : emit('play')"
        >
          <svg
            v-if="isPlaying"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="translate-x-px"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <!-- Volume Container with hover-reveal slider -->
        <div class="flex items-center gap-1 group/volume">
          <button
            type="button"
            class="text-night-text hover:text-night-accent transition-colors p-1.5 rounded-full hover:bg-white/10 outline-hidden pl-focus-ring cursor-pointer"
            :aria-label="isMuted ? 'Ativar som' : 'Desativar som'"
            data-testid="mute-btn"
            @click="emit('toggleMute')"
          >
            <svg
              v-if="isMuted || volume === 0"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v6a3 3 0 0 0 3 3h1.586l4.707 4.707A1 1 0 0 0 20 22V4a1 1 0 0 0-1.707-.707L13.586 8H12a3 3 0 0 0-3 1z" />
            </svg>
            <svg
              v-else-if="volume < 0.5"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            <svg
              v-else
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="isMuted ? 0 : volume"
            class="w-0 opacity-0 group-hover/volume:w-16 group-hover/volume:opacity-100 focus-visible:w-16 focus-visible:opacity-100 transition-all duration-200 accent-night-accent cursor-pointer h-1 rounded-full bg-white/20 outline-hidden pl-focus-ring"
            aria-label="Volume"
            @input="onVolumeInput"
          >
        </div>

        <!-- Time Label -->
        <div class="text-pl-xs font-mono tabular-nums text-night-text select-none">
          <span>{{ formattedCurrentTime }}</span>
          <span class="mx-1 text-night-muted">/</span>
          <span class="text-night-muted">{{ formattedDuration }}</span>
        </div>
      </div>

      <!-- Right Controls: Fullscreen -->
      <div>
        <button
          type="button"
          class="text-night-text hover:text-night-accent transition-colors p-1.5 rounded-full hover:bg-white/10 outline-hidden pl-focus-ring cursor-pointer"
          :aria-label="isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
          data-testid="fullscreen-btn"
          @click="emit('toggleFullscreen')"
        >
          <svg
            v-if="isFullscreen"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" />
          </svg>
          <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
