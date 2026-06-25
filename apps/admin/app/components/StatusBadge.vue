<script setup lang="ts">
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconLoader2,
  IconX,
} from '@tabler/icons-vue';
import type { VideoStatus } from '@playplus/shared';

import { getStatusBadgeLabel } from '~/utils/video-copy';

const props = defineProps<{
  status: VideoStatus;
}>();

const badgeClass = computed(() => `pl-status-badge pl-status-badge--${props.status}`);

const iconComponent = computed(() => {
  switch (props.status) {
    case 'pending':
      return IconAlertCircle;
    case 'queued':
      return IconClock;
    case 'processing':
      return IconLoader2;
    case 'ready':
      return IconCheck;
    case 'error':
      return IconX;
    default:
      return IconAlertTriangle;
  }
});
</script>

<template>
  <span :class="badgeClass">
    <component
      :is="iconComponent"
      class="size-pl-icon-sm"
      :class="{ 'animate-pl-spin motion-reduce:animate-none': status === 'processing' }"
      stroke="2.4"
      aria-hidden="true"
    />
    {{ getStatusBadgeLabel(status) }}
  </span>
</template>
