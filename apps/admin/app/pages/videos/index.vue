<script setup lang="ts">
import type { ApiListVideosResponse } from '~/utils/videos';

definePageMeta({
  layout: 'default',
});

const { api } = useApi();

const { data: videosResponse, pending, error } = await useAsyncData(
  'admin-videos',
  () => api<ApiListVideosResponse>('/videos'),
);

const totalVideos = computed(() => videosResponse.value?.meta.total ?? 0);
</script>

<template>
  <section>
    <h1 class="text-2xl font-extrabold tracking-tight text-peach-ink">
      Meus vídeos
    </h1>
    <p
      v-if="pending"
      class="mt-2 text-sm font-medium text-peach-muted"
    >
      Carregando catálogo…
    </p>
    <p
      v-else-if="error"
      class="mt-2 text-sm font-medium text-status-error-fg"
    >
      Não foi possível carregar os vídeos.
    </p>
    <p
      v-else
      class="mt-2 text-sm font-medium text-peach-muted"
    >
      {{ totalVideos }} vídeo(s) no catálogo.
    </p>
  </section>
</template>
