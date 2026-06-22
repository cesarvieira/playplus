<script setup lang="ts">
</script>

<template>
  <div class="flex min-h-screen flex-col bg-peach-page">
    <AppHeader />
    <main class="flex-1 px-7 py-6">
      <slot />
    </main>
  </div>
</template>
