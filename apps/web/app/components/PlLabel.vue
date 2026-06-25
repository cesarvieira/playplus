<script setup lang="ts">
defineProps<{
  htmlFor?: string;
}>();
</script>

<template>
  <label
    :for="htmlFor"
    class="pl-label"
  >
    <slot></slot>
  </label>
</template>
