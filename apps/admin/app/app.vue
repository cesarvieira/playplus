<script setup lang="ts">
import { providePlToast } from '~/composables/usePlToast';

providePlToast();
</script>

<template>
  <div class="min-h-screen bg-peach-page">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <PlToast />
  </div>
</template>
