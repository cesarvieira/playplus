<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    pulse?: boolean;
  }>(),
  {
    width: '100%',
    height: '1rem',
    pulse: false,
  },
);
</script>

<template>
  <div
    class="rounded-pl-md bg-peach-border-light motion-reduce:animate-none"
    :class="pulse ? 'animate-pl-pulse' : 'animate-pulse'"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>
