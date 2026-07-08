<script setup lang="ts">
import { IconCalendar, IconFileText, IconWorld } from '@tabler/icons-vue';

import {
  getPublicationBadgeLabel,
  resolvePublicationStatus,
} from '~/utils/video-publication';

const props = withDefaults(
  defineProps<{
    publishedAt: string | null;
    interactive?: boolean;
    expanded?: boolean;
    disabled?: boolean;
    controlsId?: string;
  }>(),
  {
    interactive: false,
    expanded: false,
    disabled: false,
    controlsId: undefined,
  },
);

const emit = defineEmits<{
  activate: [];
}>();

const publicationStatus = computed(() => resolvePublicationStatus(props.publishedAt));

const badgeClass = computed(() => [
  'pl-publication-badge',
  `pl-publication-badge--${publicationStatus.value}`,
  props.interactive ? 'pl-publication-badge--interactive pl-focus-ring' : null,
]);

const label = computed(() =>
  getPublicationBadgeLabel(publicationStatus.value, props.publishedAt),
);

const iconComponent = computed(() => {
  switch (publicationStatus.value) {
    case 'draft':
      return IconFileText;
    case 'scheduled':
      return IconCalendar;
    case 'published':
      return IconWorld;
    default:
      return IconFileText;
  }
});

function onActivate() {
  if (!props.disabled) {
    emit('activate');
  }
}
</script>

<template>
  <button
    v-if="interactive"
    type="button"
    :class="badgeClass"
    :aria-expanded="expanded"
    aria-haspopup="menu"
    :aria-controls="controlsId"
    :disabled="disabled"
    :aria-label="`${label}. Abrir ações de publicação`"
    @click="onActivate"
  >
    <component
      :is="iconComponent"
      class="size-pl-icon-sm"
      stroke="2.4"
      aria-hidden="true"
    />
    {{ label }}
  </button>
  <span
    v-else
    :class="badgeClass"
  >
    <component
      :is="iconComponent"
      class="size-pl-icon-sm"
      stroke="2.4"
      aria-hidden="true"
    />
    {{ label }}
  </span>
</template>
