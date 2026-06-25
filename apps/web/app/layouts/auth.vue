<script setup lang="ts">
import PlayLogo from '~/components/PlayLogo.vue';
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-night-canvas p-4 md:p-8">
    <div
      class="flex w-full max-w-5xl overflow-hidden rounded-pl-xl border border-night-border-panel shadow-night-panel md:flex"
    >
      <aside
        class="hidden w-pl-hero-aside shrink-0 flex-col justify-between bg-hero-login p-11 md:flex"
        aria-hidden="true"
      >
        <div class="flex items-center gap-3">
          <PlayLogo bg-class="text-night-ink/90" fg-class="text-night-text" />
          <span class="text-pl-2xl font-extrabold tracking-pl-tight text-night-ink">Play+</span>
        </div>

        <div class="flex items-end gap-3.5">
          <div class="h-35 w-24 rounded-pl-lg bg-night-ink/18"></div>
          <div class="h-43 w-24 rounded-pl-lg bg-night-ink/30"></div>
          <div class="h-30 w-24 rounded-pl-lg bg-night-ink/14"></div>
        </div>

        <div>
          <h2 class="text-pl-hero font-extrabold leading-tight tracking-pl-tight text-night-ink">
            Seu cinema<br>particular.
          </h2>
          <p class="mt-2.5 text-pl-sm font-medium text-night-ink/72">
            Guarde, assista e retome de onde parou.
          </p>
        </div>
      </aside>

      <main class="flex w-full flex-1 flex-col justify-center bg-night-panel p-8 md:p-14">
        <slot></slot>
      </main>
    </div>
  </div>
</template>
