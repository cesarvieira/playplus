<script setup lang="ts">
import PlayLogo from '~/components/PlayLogo.vue';
import type { ErrorDevDetails, ErrorPageContent } from '~/utils/error-page';
import { formatErrorDevDetails } from '~/utils/error-page';

const props = defineProps<{
  content: ErrorPageContent;
  devDetails?: ErrorDevDetails | null;
  showDevPanel?: boolean;
}>();

const emit = defineEmits<{
  home: [];
  retry: [];
}>();

const devOpen = ref(Boolean(props.showDevPanel));
const copied = ref(false);

const chevronClass = computed(() => (devOpen.value ? 'rotate-180' : 'rotate-0'));

function toggleDev() {
  devOpen.value = !devOpen.value;
}

async function copyDevDetails() {
  if (!props.devDetails) {
    return;
  }

  const text = formatErrorDevDetails(props.devDetails);

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <div class="error-page flex min-h-dvh flex-col text-peach-ink">
    <div class="flex h-18 shrink-0 items-center justify-between px-9">
      <div class="flex items-center gap-2.75">
        <PlayLogo />
        <div class="ple-brand">
          Play+
          <span class="text-peach-accent"> Admin</span>
        </div>
      </div>

      <div class="ple-pill">
        <div class="size-2.25 animate-ple-flicker rounded-full bg-peach-accent"></div>
        {{ content.pill }}
      </div>
    </div>

    <div class="flex min-h-[calc(100dvh-72px)] flex-1 items-center justify-center px-9 pb-14 pt-6">
      <div class="flex w-full max-w-150 flex-col items-center text-center">
        <div class="relative mb-9.5 h-52 w-85">
          <slot name="visual"></slot>
        </div>

        <h1 class="ple-headline">
          {{ content.headline }}
        </h1>

        <p class="ple-body mt-4 max-w-115">
          {{ content.body }}
        </p>

        <div class="mt-8.5 flex flex-wrap justify-center gap-3">
          <button type="button" class="ple-btn ple-btn--primary" @click="emit('home')">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Voltar ao início
          </button>

          <button type="button" class="ple-btn ple-btn--secondary" @click="emit('retry')">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Tentar de novo
          </button>
        </div>

        <p class="ple-footnote mt-7.5 max-w-105">
          {{ content.footnote }}
        </p>

        <div v-if="showDevPanel && devDetails" class="mt-10.5 w-full max-w-150 text-left">
          <button type="button" class="ple-dev-toggle" @click="toggleDev">
            <div class="ple-dev-badge">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Modo dev
            </div>
            <span class="ple-dev-toggle-label"> Detalhes técnicos — visível só para a equipe </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="ple-dev-chevron"
              :class="chevronClass"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div v-if="devOpen" class="ple-dev-panel">
            <div class="ple-dev-panel__header">
              <div class="ple-dev-panel__dot ple-dev-panel__dot--red"></div>
              <div class="ple-dev-panel__dot ple-dev-panel__dot--yellow"></div>
              <div class="ple-dev-panel__dot ple-dev-panel__dot--green"></div>
              <span class="ple-dev-panel__filename">error.log</span>
              <span class="flex-1"></span>
              <button
                type="button"
                class="ple-dev-panel__copy-btn"
                :aria-label="copied ? 'Copiado' : 'Copiar detalhes do erro'"
                :title="copied ? 'Copiado' : 'Copiar'"
                @click="copyDevDetails"
              >
                <svg
                  v-if="copied"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <svg
                  v-else
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect
                    width="14"
                    height="14"
                    x="8"
                    y="8"
                    rx="2"
                    ry="2"
                  />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>

            <div class="ple-dev-panel__body">
              <div>
                <span class="ple-dev-panel__error-name">{{ devDetails.name }}</span>
                <span class="ple-dev-panel__error-sep">: </span>
                <span class="ple-dev-panel__error-message">{{ devDetails.message }}</span>
              </div>

              <div
                v-for="(line, index) in devDetails.stackLines"
                :key="`${line}-${index}`"
                class="ple-dev-panel__stack-line"
                :class="index === 0 ? 'mt-2.5' : ''"
              >
                at {{ line }}
              </div>

              <div class="ple-dev-panel__meta">
                <span class="ple-dev-panel__meta-key">statusCode</span>
                <span class="ple-dev-panel__meta-value--error">{{ devDetails.statusCode }}</span>
                <span class="ple-dev-panel__meta-key">route</span>
                <span>{{ devDetails.route }}</span>
                <span class="ple-dev-panel__meta-key">timestamp</span>
                <span>{{ devDetails.timestamp }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
