<script setup lang="ts">
import type { VideoListFilter } from '~/utils/videos';

const model = defineModel<VideoListFilter>({ required: true });

const filters: { value: VideoListFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ready', label: 'Pronto' },
  { value: 'active', label: 'Em andamento' },
  { value: 'error', label: 'Erro' },
];
</script>

<template>
  <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar vídeos por status">
    <button
      v-for="item in filters"
      :key="item.value"
      type="button"
      class="pl-filter-pill"
      :class="{ 'pl-filter-pill--active': model === item.value }"
      :aria-pressed="model === item.value"
      @click="model = item.value"
    >
      {{ item.label }}
    </button>
  </div>
</template>
