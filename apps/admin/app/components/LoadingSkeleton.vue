<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number;
  }>(),
  {
    count: 5,
  },
);
</script>

<template>
  <div class="pl-video-table" aria-hidden="true">
    <div
      v-for="index in count"
      :key="index"
      class="pl-video-skeleton"
    >
      <PlSkeleton width="8.25rem" height="4.875rem" />
      <div class="min-w-0 flex-1 space-y-2">
        <PlSkeleton width="55%" height="1rem" />
        <PlSkeleton width="35%" height="0.75rem" />
      </div>
      <PlSkeleton width="5.5rem" height="1.75rem" />
      <PlSkeleton width="6rem" height="2.25rem" />
    </div>
  </div>
</template>
