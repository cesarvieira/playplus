<script setup lang="ts">
const SKELETON_COUNT = 4;
</script>

<template>
  <div
    class="pl-catalog-grid pl-catalog-grid--skeleton"
    aria-hidden="true"
  >
    <div
      v-for="index in SKELETON_COUNT"
      :key="index"
      class="pl-catalog-skeleton"
    >
      <div class="pl-catalog-skeleton__thumb"></div>
      <div class="pl-catalog-skeleton__body">
        <PlSkeleton
          variant="text"
          width="80%"
        />
        <PlSkeleton
          variant="text"
          width="55%"
          height="0.6875rem"
        />
      </div>
    </div>
  </div>
</template>
