<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'text' | 'card';
    width?: string;
    height?: string;
  }>(),
  {
    variant: 'text',
    width: undefined,
    height: undefined,
  },
);

const skeletonClass = computed(() =>
  props.variant === 'card' ? 'pl-skeleton--card' : 'pl-skeleton--text',
);

const skeletonStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.width) {
    style.width = props.width;
  }
  if (props.height) {
    style.height = props.height;
  }
  return Object.keys(style).length > 0 ? style : undefined;
});
</script>

<template>
  <div
    :class="['pl-skeleton', skeletonClass]"
    :style="skeletonStyle"
    aria-hidden="true"
  ></div>
</template>
