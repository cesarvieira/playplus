<script setup lang="ts">
const { isReconnecting } = useVideoStatusWs();
</script>

<template>
  <div
    v-if="isReconnecting"
    class="pl-ws-reconnect-banner"
    role="status"
    aria-live="polite"
  >
    <span
      class="size-pl-icon-sm shrink-0 animate-pl-spin rounded-full border-2 border-peach-muted/40 border-t-peach-subtle motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
    <span class="pl-ws-reconnect-banner__text">Reconectando…</span>
  </div>
</template>
