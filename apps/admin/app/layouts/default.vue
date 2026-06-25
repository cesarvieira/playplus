<script setup lang="ts">
const authStore = useAuthStore();
const { connect, disconnect } = useVideoStatusWs();

watch(
  () => authStore.isAuthenticated,
  (authed) => {
    if (authed) {
      connect();
    } else {
      disconnect();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex min-h-screen flex-col bg-peach-page">
    <AppHeader />
    <WsReconnectBanner />
    <main class="flex-1 px-7 py-6">
      <slot></slot>
    </main>
  </div>
</template>
