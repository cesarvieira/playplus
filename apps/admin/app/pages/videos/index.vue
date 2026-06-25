<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue';
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
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="pl-page-title">
        Meus vídeos
      </h1>
      <PlButton to="/videos/new" size="sm">
        <IconPlus class="size-pl-icon-sm" stroke="2.4" aria-hidden="true" />
        Adicionar vídeo
      </PlButton>
    </div>
    <p
      v-if="pending"
      class="pl-page-lead"
    >
      Carregando catálogo…
    </p>
    <p
      v-else-if="error"
      class="pl-page-lead pl-text-error"
    >
      Não foi possível carregar os vídeos.
    </p>
    <p
      v-else
      class="pl-page-lead"
    >
      {{ totalVideos }} vídeo(s) no catálogo.
    </p>
  </section>
</template>
