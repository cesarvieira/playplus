<script setup lang="ts">
import PlayLogo from '~/components/PlayLogo.vue';
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-peach-page p-4 md:p-8">
    <div
      class="flex w-full max-w-5xl overflow-hidden rounded-pl-2xl bg-peach-surface shadow-pl-elevated"
    >
      <aside
        class="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-peach-hero-from via-peach-hero-via to-peach-hero-to p-11 md:flex"
        aria-hidden="true"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex size-[42px] items-center justify-center rounded-[13px] bg-white/90"
          >
            <PlayLogo class="text-peach-hero-to" />
          </div>
          <span class="text-[21px] font-extrabold tracking-tight text-white">Play+</span>
        </div>

        <div class="flex items-end gap-3.5">
          <div class="h-[140px] w-24 rounded-pl-lg bg-white/30" />
          <div class="h-[172px] w-24 rounded-pl-lg bg-white/45" />
          <div class="h-[120px] w-24 rounded-pl-lg bg-white/20" />
        </div>

        <div>
          <h2 class="text-[28px] font-extrabold leading-tight tracking-tight text-white">
            Seu cinema<br>particular.
          </h2>
          <p class="mt-2.5 text-sm font-medium text-white/85">
            Guarde, assista e retome de onde parou.
          </p>
        </div>
      </aside>

      <main class="flex w-full flex-1 flex-col justify-center p-8 md:p-14">
        <slot />
      </main>
    </div>
  </div>
</template>
