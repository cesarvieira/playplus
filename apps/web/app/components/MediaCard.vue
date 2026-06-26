<script setup lang="ts">
import { IconMovie, IconPlayerPlay } from '@tabler/icons-vue';

import { formatDate, formatDuration, gradientForVideoId } from '~/utils/format';
import type { VideoListItem } from '~/utils/videos';

const props = defineProps<{
  video: VideoListItem;
}>();

const durationLabel = computed(() => formatDuration(props.video.duration));

const metaLine = computed(() => {
  const date = formatDate(props.video.created_at);
  const duration = durationLabel.value;

  return duration ? `${date} · ${duration}` : date;
});

const placeholderGradient = computed(() => gradientForVideoId(props.video.id));

const hasThumbnail = computed(() => Boolean(props.video.thumbnail_url));
</script>

<template>
  <NuxtLink
    :to="`/${video.id}`"
    class="pl-media-card pl-focus-ring"
  >
    <div
      class="pl-media-card__thumb"
      :class="hasThumbnail ? undefined : placeholderGradient"
    >
      <img
        v-if="hasThumbnail"
        :src="video.thumbnail_url!"
        alt=""
        class="pl-media-card__thumb-image"
      >
      <div
        class="pl-media-card__scrim"
        aria-hidden="true"
      ></div>
      <div
        v-if="hasThumbnail"
        class="pl-media-card__play"
        aria-hidden="true"
      >
        <IconPlayerPlay
          class="size-pl-icon-md"
          stroke="2.4"
          fill="currentColor"
        />
      </div>
      <IconMovie
        v-else
        class="pl-media-card__placeholder-icon size-pl-media-md"
        stroke="1.5"
        aria-hidden="true"
      />
      <span
        v-if="durationLabel"
        class="pl-media-card__duration"
      >
        {{ durationLabel }}
      </span>
    </div>
    <div class="pl-media-card__body">
      <h2 class="pl-media-card__title">
        {{ video.title }}
      </h2>
      <p class="pl-media-card__meta">
        {{ metaLine }}
      </p>
    </div>
  </NuxtLink>
</template>
