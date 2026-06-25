<script setup lang="ts">
import { VIDEO_STATUS, type VideoStatus } from '@playplus/shared';

const readyStatus: VideoStatus = VIDEO_STATUS.READY;
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-8">
    <div class="text-center">
      <h1 class="text-2xl font-semibold">
        Play+ Web
      </h1>
      <p class="mt-2 text-sm text-neutral-500">
        Scaffold Nuxt 4 — status de referência: {{ readyStatus }}
      </p>
    </div>
  </main>
</template>
