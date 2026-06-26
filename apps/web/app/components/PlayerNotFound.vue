<script setup lang="ts">
import { IconMovie } from '@tabler/icons-vue';
import PlayLogo from '~/components/PlayLogo.vue';
</script>

<template>
  <div
    class="relative flex flex-col justify-between w-full h-full bg-[#14100D] border border-[#2C231D] text-[#F5EEE8] rounded-pl-lg overflow-hidden aspect-video"
  >
    <!-- Player Header -->
    <header
      class="flex-none h-14 border-b border-[#2C231D] flex items-center justify-between px-6"
    >
      <div class="flex items-center gap-2.5">
        <PlayLogo size="sm" />
        <span class="text-pl-sm font-extrabold tracking-pl-tight text-[#F5EEE8]">Play+</span>
      </div>
      <div
        class="flex items-center gap-2 px-3 py-1 rounded-full bg-[#241D17] border border-[#322620] text-[#B59C8C] text-pl-2xs font-bold"
      >
        <div class="size-1.5 rounded-full bg-[#E89B8E]"></div>
        Sessão não encontrada
      </div>
    </header>

    <!-- Center Content -->
    <div class="flex-1 flex items-center justify-center p-4 min-h-0 overflow-y-auto">
      <div class="max-w-md w-full flex flex-col items-center text-center">
        <!-- Visual Container -->
        <div class="relative w-48 h-28 mb-5 shrink-0 select-none">
          <div
            class="absolute inset-0 rounded-[22px] bg-linear-to-br from-[#E6B196] via-[#D2876F] to-[#BC6663] shadow-[0_16px_36px_rgba(200,90,50,0.25)]"
          ></div>
          <div class="absolute inset-2.5 rounded-pl-sm overflow-hidden bg-black flex items-center justify-center">
            <IconMovie
              class="size-12 text-[#E6B196] opacity-80"
              stroke="1.5"
            />
          </div>
          <div
            class="absolute -top-2 -right-2 w-10 h-10 rounded-pl-sm bg-[#1B1511] border border-[#34291F] shadow-lg flex items-center justify-center z-10"
          >
            <span class="font-mono text-pl-sm font-semibold text-[#E89890]">404</span>
          </div>
        </div>

        <h1 class="margin-0 text-pl-lg font-extrabold tracking-pl-tight text-[#F5EEE8] max-w-xs">
          Essa sessão não está em cartaz.
        </h1>
        <p class="mt-2 text-pl-xs text-[#9A8C82] leading-relaxed max-w-sm text-pretty">
          Procuramos em todas as salas e essa página não apareceu. Deve ter ficado no chão da sala de edição.
        </p>

        <!-- Actions -->
        <div class="mt-5 flex flex-wrap gap-2.5 justify-center">
          <NuxtLink
            to="/"
            class="h-9 px-4 rounded-pl-btn bg-cta-gradient text-[#2A1410] font-extrabold text-pl-xs flex items-center gap-2 hover:opacity-95 transition-opacity pl-focus-ring"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Voltar à estante
          </NuxtLink>
        </div>

        <div class="mt-4 text-[10.5px] text-[#73655B] font-medium max-w-xs leading-normal text-pretty">
          Confira o endereço ou volte para a sua estante — lá tudo continua no lugar.
        </div>
      </div>
    </div>

    <!-- Bottom Spacing for balance -->
    <div
      class="h-6 flex-none"
      aria-hidden="true"
    ></div>
  </div>
</template>
