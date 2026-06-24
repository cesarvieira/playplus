<script setup lang="ts">
defineProps<{
  htmlFor?: string;
}>();
</script>

<template>
  <label
    :for="htmlFor"
    class="text-sm font-semibold text-peach-subtle"
  >
    <slot></slot>
  </label>
</template>
