<script setup lang="ts">
import PlayLogo from '~/components/PlayLogo.vue';

defineProps<{
  code: string;
  title: string;
  message: string;
}>();

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div
    class="relative flex flex-col justify-between w-full h-full bg-[#14100D] border border-[#2C231D] text-[#F5EEE8] rounded-pl-lg overflow-hidden aspect-video"
  >
    <!-- Status Code Tag (Top Left Overlay) -->
    <div
      class="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[rgba(20,10,8,0.5)] border border-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-full"
    >
      <div class="size-1.5 rounded-full bg-[#E89890]"></div>
      <span class="font-mono text-[10px] font-bold text-[#F5EEE8] tracking-wider">{{ code }}</span>
    </div>

    <!-- Player Header -->
    <header
      class="flex-none h-14 border-b border-[#2C231D] flex items-center justify-between px-6"
    >
      <NuxtLink
        to="/"
        class="flex items-center gap-2 text-[#9A8C82] hover:text-[#F5EEE8] transition-colors text-pl-xs font-bold pl-focus-ring"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line
            x1="19"
            y1="12"
            x2="5"
            y2="12"
          />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Voltar aos vídeos
      </NuxtLink>
      <div class="flex items-center gap-2.5">
        <PlayLogo size="sm" />
        <span class="text-pl-sm font-extrabold tracking-pl-tight text-[#F5EEE8]">Play+</span>
      </div>
    </header>

    <!-- Center Content -->
    <div class="flex-1 flex items-center justify-center p-4 min-h-0 overflow-y-auto">
      <div class="max-w-md w-full flex flex-col items-center text-center">
        <!-- Tangled film strip representation -->
        <div class="relative w-36 h-20 mb-5 shrink-0 select-none wobble-animation">
          <div
            class="absolute inset-0 rounded-lg bg-[#1E1712] border border-[#3A2D24] rotate-[-7deg] flex flex-col justify-between py-1.5"
          >
            <div class="flex justify-around px-1.5">
              <div
                v-for="i in 4"
                :key="`t1-${i}`"
                class="w-2 h-1.5 rounded-xs bg-[#0C0907]"
              ></div>
            </div>
            <div class="flex justify-around px-1.5">
              <div
                v-for="i in 4"
                :key="`b1-${i}`"
                class="w-2 h-1.5 rounded-xs bg-[#0C0907]"
              ></div>
            </div>
          </div>
          <div
            class="absolute left-[60%] -top-4 w-28 h-12 rounded-md bg-[#1E1712] border border-[#3A2D24] rotate-[24deg] flex flex-col justify-between py-1 shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
          >
            <div class="flex justify-around px-1.5">
              <div
                v-for="i in 3"
                :key="`t2-${i}`"
                class="w-2 h-1.5 rounded-xs bg-[#0C0907]"
              ></div>
            </div>
            <div class="flex justify-around px-1.5">
              <div
                v-for="i in 3"
                :key="`b2-${i}`"
                class="w-2 h-1.5 rounded-xs bg-[#0C0907]"
              ></div>
            </div>
          </div>
        </div>

        <h2 class="margin-0 text-pl-lg font-extrabold tracking-pl-tight text-[#F5EEE8] max-w-xs">
          {{ title }}
        </h2>
        <p class="mt-2 text-pl-xs text-[#9A8C82] leading-relaxed max-w-sm text-pretty">
          {{ message }}
        </p>

        <!-- Actions -->
        <div class="mt-5 flex flex-wrap gap-2.5 justify-center">
          <button
            type="button"
            class="h-9 px-4 rounded-pl-btn bg-cta-gradient text-[#2A1410] font-extrabold text-pl-xs flex items-center gap-2 hover:opacity-95 transition-opacity pl-focus-ring cursor-pointer"
            @click="emit('retry')"
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
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Recarregar vídeo
          </button>
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

<style scoped>
.wobble-animation {
  animation: wse-wobble 3.4s ease-in-out infinite;
}

@keyframes wse-wobble {
  0%,
  100% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
}
</style>
