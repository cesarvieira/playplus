<script setup lang="ts">
import { providePlToast } from '~/composables/usePlToast';

providePlToast();

const error = useError();
</script>

<template>
  <div v-if="!error" class="min-h-screen bg-peach-page">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
  <NuxtPage v-else />
  <PlToast />
</template>
