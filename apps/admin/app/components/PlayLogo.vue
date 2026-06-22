<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md';
  }>(),
  {
    size: 'md',
  },
);

const dimensions = computed(() => (props.size === 'sm' ? 14 : 18));
</script>

<template>
  <svg
    :width="dimensions"
    :height="dimensions"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
</template>
