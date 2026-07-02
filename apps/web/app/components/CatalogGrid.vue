<script setup lang="ts">
import type { VideoListItem } from '~/utils/videos';

defineProps<{
  videos: VideoListItem[];
}>();

defineEmits<{
  select: [video: VideoListItem];
}>();
</script>

<template>
  <div class="pl-catalog-grid">
    <MediaCard
      v-for="video in videos"
      :key="video.id"
      :video="video"
      @select="$emit('select', $event)"
    />
  </div>
</template>
