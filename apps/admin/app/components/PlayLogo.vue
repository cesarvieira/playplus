<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md';
    bgClass?: string;
    fgClass?: string;
  }>(),
  {
    size: 'md',
    bgClass: 'text-peach-ink',
    fgClass: 'text-white',
  },
);

const sizeClass = computed(() =>
  props.size === 'sm' ? 'h-pl-logo-sm w-auto' : 'h-pl-logo-md w-auto',
);
</script>

<template>
  <svg :class="sizeClass" viewBox="0 0 16 12" fill="none" aria-hidden="true">
    <rect
      :class="bgClass"
      class="fill-current"
      width="16"
      height="12"
      rx="3.9"
    />
    <g :class="fgClass" class="fill-current">
      <path d="M6.53 3.4L6.53 8.6L10.93 6Z" />
      <path d="M11.3 2.6h0.8v1.1h1.1v0.8h-1.1v1.1h-0.8v-1.1h-1.1v-0.8h1.1z" />
    </g>
  </svg>
</template>
