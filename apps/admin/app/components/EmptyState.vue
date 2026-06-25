<script setup lang="ts">
import { IconVideo } from '@tabler/icons-vue';

withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    showCta?: boolean;
  }>(),
  {
    title: 'Nenhum vídeo por aqui',
    message: 'Adicione seu primeiro vídeo para começar o catálogo.',
    showCta: true,
  },
);
</script>

<template>
  <div class="pl-empty-state">
    <div class="mb-4 flex size-pl-media-lg items-center justify-center rounded-pl-md bg-peach-chip text-peach-muted">
      <IconVideo class="size-pl-icon-md" stroke="1.8" aria-hidden="true" />
    </div>
    <h2 class="pl-empty-state__title">
      {{ title }}
    </h2>
    <p class="pl-empty-state__message">
      {{ message }}
    </p>
    <PlButton
      v-if="showCta"
      to="/videos/new"
      size="sm"
      class="mt-5"
    >
      Adicionar vídeo
    </PlButton>
  </div>
</template>
