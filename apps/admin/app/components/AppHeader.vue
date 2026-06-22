<script setup lang="ts">
import PlayLogo from '~/components/PlayLogo.vue';
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-header shrink-0 items-center gap-4 border-b border-peach-border-light bg-peach-surface px-7"
  >
    <div class="flex items-center gap-2.5">
      <div
        class="flex size-[34px] items-center justify-center rounded-[11px] bg-peach-ink"
      >
        <PlayLogo class="text-white" size="sm" />
      </div>
      <span class="text-lg font-extrabold tracking-tight text-peach-ink">Play+</span>
    </div>

    <nav class="ml-2 hidden items-center gap-1 sm:flex" aria-label="Principal">
      <span
        class="rounded-pl-md px-3 py-1.5 text-sm font-semibold text-peach-ink"
      >
        Meus vídeos
      </span>
    </nav>

    <div class="ml-auto flex items-center gap-3">
      <div
        class="flex size-9 items-center justify-center rounded-full bg-peach-border-light text-sm font-bold text-peach-subtle"
        aria-hidden="true"
      >
        A
      </div>
      <span class="hidden text-sm font-semibold text-peach-subtle sm:inline">Admin</span>
    </div>
  </header>
</template>
