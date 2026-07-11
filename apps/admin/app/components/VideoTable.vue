<script setup lang="ts">
import { getStatusLiveAnnouncement } from '~/utils/video-copy';
import type { DisplayVideoRow } from '~/utils/videos';

const props = defineProps<{
  videos: DisplayVideoRow[];
  transcodeLoadingId?: string | null;
  publicationLoadingId?: string | null;
  deleteLoadingId?: string | null;
  webUrl: string;
}>();

const emit = defineEmits<{
  transcode: [videoId: string];
  publish: [videoId: string];
  schedule: [videoId: string];
  unpublish: [videoId: string];
  delete: [videoId: string];
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
      :publication-loading="publicationLoadingId === video.id"
      :delete-loading="deleteLoadingId === video.id"
      @transcode="emit('transcode', $event)"
      @publish="emit('publish', $event)"
      @schedule="emit('schedule', $event)"
      @unpublish="emit('unpublish', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>
