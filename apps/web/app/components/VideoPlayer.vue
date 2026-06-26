<script setup lang="ts">
import { ref, computed } from 'vue';
import PlayLogo from '~/components/PlayLogo.vue';
import type { VideoDetail } from '~/composables/useVideoDetail';
import { usePlayer } from '~/composables/usePlayer';

const props = defineProps<{
  video: VideoDetail;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const streamUrl = computed(() => props.video.stream_url);

const { isBuffering, isError, retry } = usePlayer(videoRef, streamUrl);
</script>

<template>
  <div class="relative w-full h-full bg-black aspect-video overflow-hidden group">
    <!-- The Video Element -->
    <video
      ref="videoRef"
      :poster="video.thumbnail_url || undefined"
      playsinline
      preload="metadata"
      controls
      class="absolute inset-0 w-full h-full object-contain z-0"
      :class="{ 'bg-linear-to-br from-[#3A2E5C] via-[#5A4A86] to-[#8A6FA8]': !video.thumbnail_url }"
    ></video>

    <!-- Header Overlay (visible on hover or when focusing inside) -->
    <header
      class="absolute top-0 left-0 right-0 p-6 z-10 flex items-center justify-between bg-linear-to-b from-black/80 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
    >
      <div class="flex items-center gap-2.5">
        <PlayLogo size="sm" />
        <span class="text-pl-sm font-extrabold tracking-pl-tight text-night-text">Play+</span>
      </div>
      <NuxtLink
        to="/"
        class="text-pl-xs font-bold text-night-subtle hover:text-night-text transition-colors pl-focus-ring"
      >
        Voltar aos vídeos
      </NuxtLink>
    </header>

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
      <span class="text-pl-sm font-semibold text-night-text">Carregando...</span>
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
  </div>
</template>
