<script setup lang="ts">
import PlayLogo from '~/components/PlayLogo.vue';
import type { VideoDetail } from '~/composables/useVideoDetail';

defineProps<{
  video: VideoDetail;
}>();
</script>

<template>
  <div class="relative flex flex-col justify-between w-full h-full bg-black p-6 aspect-video">
    <!-- Player Header -->
    <header class="flex items-center justify-between w-full z-10">
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

    <!-- Center content placeholder -->
    <div class="flex-1 flex items-center justify-center">
      <span class="text-pl-sm font-bold text-night-text">[VideoPlayer Stub - {{ video.title }}]</span>
    </div>

    <!-- Bottom balance spacer -->
    <div
      class="h-6"
      aria-hidden="true"
    ></div>
  </div>
</template>
