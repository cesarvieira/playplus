<script setup lang="ts">
import { IconAlertTriangle, IconExternalLink, IconRefresh } from '@tabler/icons-vue';
import { VIDEO_STATUS } from '@playplus/shared';

import { formatDate, formatDuration } from '~/utils/format';
import {
  getRowPrimaryAction,
  getRowSecondaryText,
  resolveVideoErrorReason,
} from '~/utils/video-copy';
import type { DisplayVideoRow } from '~/utils/videos';

const props = defineProps<{
  video: DisplayVideoRow;
  transcodeLoading?: boolean;
  webUrl: string;
}>();

const emit = defineEmits<{
  transcode: [videoId: string];
}>();

const primaryAction = computed(() =>
  getRowPrimaryAction(props.video.status, props.video.upload_complete),
);

const secondaryText = computed(() =>
  getRowSecondaryText(props.video.status, props.video.upload_complete),
);

const durationLabel = computed(() => formatDuration(props.video.duration));

const formattedDate = computed(() =>
  formatDate(props.video.created_at, 'pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
);

const watchUrl = computed(() => `${props.webUrl.replace(/\/$/, '')}/${props.video.id}`);

const thumbClass = computed(() => `pl-video-thumb pl-video-thumb--${props.video.status}`);

const showProgress = computed(
  () => props.video.status === VIDEO_STATUS.PROCESSING && props.video.progress !== undefined,
);

const errorCopy = computed(() => resolveVideoErrorReason(props.video.errorReason));
</script>

<template>
  <article class="pl-video-row">
    <div :class="thumbClass">
      <template v-if="video.status === VIDEO_STATUS.PROCESSING && !showProgress">
        <div class="pl-video-thumb__overlay"></div>
        <span
          class="relative size-pl-icon-md animate-pl-spin rounded-full border-2 border-peach-surface/40 border-t-peach-surface motion-reduce:animate-none"
          aria-hidden="true"
        ></span>
      </template>
      <template v-else-if="video.status === VIDEO_STATUS.ERROR">
        <IconAlertTriangle
          class="size-pl-icon-md text-peach-surface/90"
          stroke="2"
          aria-hidden="true"
        />
      </template>
      <template v-else-if="video.thumbnail_url">
        <img
          :src="video.thumbnail_url"
          :alt="`Miniatura de ${video.title}`"
          class="size-full object-cover"
        >
      </template>
      <template v-else>
        <div class="pl-play-glyph" aria-hidden="true"></div>
      </template>
      <span
        v-if="durationLabel && video.status !== VIDEO_STATUS.ERROR"
        class="pl-video-thumb__duration"
      >
        {{ durationLabel }}
      </span>
    </div>

    <div class="min-w-0 flex-1">
      <h3 class="pl-video-row__title">
        {{ video.title }}
      </h3>
      <p class="pl-video-row__meta">
        {{ formattedDate }}
      </p>
      <div
        v-if="showProgress"
        class="mt-2 flex max-w-xs items-center gap-2.5"
      >
        <PlProgressBar
          class="flex-1"
          :value="video.progress ?? 0"
          :show-value="true"
          :value-text="`Processando ${video.progress ?? 0} por cento`"
        />
      </div>
      <p
        v-else-if="video.status === VIDEO_STATUS.ERROR"
        class="pl-video-row__error"
      >
        {{ errorCopy }}
      </p>
    </div>

    <StatusBadge :status="video.status" />

    <div class="pl-video-row__action-slot">
      <PlButton
        v-if="primaryAction === 'watch'"
        :to="watchUrl"
        target="_blank"
        rel="noopener noreferrer"
        variant="secondary"
        size="sm"
      >
        Assistir
        <IconExternalLink class="size-pl-icon-sm" stroke="2.2" aria-hidden="true" />
      </PlButton>
      <PlButton
        v-else-if="primaryAction === 'transcode'"
        variant="primary"
        size="sm"
        :loading="transcodeLoading"
        @click="emit('transcode', video.id)"
      >
        Iniciar transcodificação
      </PlButton>
      <PlButton
        v-else-if="primaryAction === 'retry'"
        variant="danger"
        size="sm"
        :loading="transcodeLoading"
        @click="emit('transcode', video.id)"
      >
        <IconRefresh class="size-pl-icon-sm" stroke="2.2" aria-hidden="true" />
        Tentar de novo
      </PlButton>
      <span
        v-else-if="secondaryText"
        class="pl-video-row__action-text"
      >
        {{ secondaryText }}
      </span>
    </div>
  </article>
</template>
