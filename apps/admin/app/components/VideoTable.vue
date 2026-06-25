<script setup lang="ts">
import { getStatusLiveAnnouncement } from '~/utils/video-copy';
import type { DisplayVideoRow } from '~/utils/videos';

const props = defineProps<{
  videos: DisplayVideoRow[];
  transcodeLoadingId?: string | null;
  webUrl: string;
}>();

const emit = defineEmits<{
  transcode: [videoId: string];
}>();

const liveMessage = ref('');

watch(
  () => props.videos.map(video => `${video.id}:${video.status}`).join('|'),
  () => {
    const latest = props.videos.find(
      video => video.status === 'processing' || video.status === 'ready' || video.status === 'error',
    );

    if (latest) {
      liveMessage.value = getStatusLiveAnnouncement(latest.status);
    }
  },
);
</script>

<template>
  <div class="pl-video-table">
    <p class="sr-only" aria-live="polite" aria-atomic="true">
      {{ liveMessage }}
    </p>
    <VideoRow
      v-for="video in videos"
      :key="video.id"
      :video="video"
      :web-url="webUrl"
      :transcode-loading="transcodeLoadingId === video.id"
      @transcode="emit('transcode', $event)"
    />
  </div>
</template>
