<script setup lang="ts">
const route = useRoute();

const videoId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? id[0] : id;
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <h1 class="text-pl-2xl font-extrabold tracking-pl-tight text-night-text">
      Player
    </h1>
    <p class="text-pl-sm font-medium text-night-muted">
      Reprodução em breve.
    </p>
    <p class="text-pl-xs text-night-muted">
      ID: {{ videoId }}
    </p>
  </div>
</template>
