<script setup lang="ts">
import { IconVideo } from '@tabler/icons-vue';

withDefaults(
  defineProps<{
    title?: string;
    message?: string;
  }>(),
  {
    title: 'Nenhum vídeo disponível.',
    message: 'Quando um vídeo terminar de processar, ele aparecerá aqui.',
  },
);
</script>

<template>
  <div class="pl-empty-state">
    <div class="pl-empty-state__icon">
      <IconVideo
        class="size-pl-icon-md"
        stroke="1.5"
        aria-hidden="true"
      />
    </div>
    <h2 class="pl-empty-state__title">
      {{ title }}
    </h2>
    <p class="pl-empty-state__message">
      {{ message }}
    </p>
  </div>
</template>
