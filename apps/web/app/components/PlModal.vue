<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    subtitle?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    closeOnBackdrop: true,
    closeOnEscape: true,
  },
);

const emit = defineEmits<{
  close: [];
}>();

const titleId = `pl-modal-title-${useId()}`;

function onBackdropClick() {
  if (props.closeOnBackdrop) {
    emit('close');
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open && props.closeOnEscape) {
    emit('close');
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (import.meta.client) {
        document.addEventListener('keydown', onKeydown);
      }
    } else {
      if (import.meta.client) {
        document.removeEventListener('keydown', onKeydown);
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', onKeydown);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="pl-modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        @click.self="onBackdropClick"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="w-full max-w-lg rounded-pl-xl bg-night-panel border border-night-border-strong p-6 shadow-night-panel relative pl-modal-content"
        >
          <header v-if="$slots.title || title" class="mb-5 flex justify-between items-start">
            <div>
              <h2 :id="titleId" class="text-pl-xl font-extrabold text-night-text">
                <slot name="title">
                  {{ title }}
                </slot>
              </h2>
              <p v-if="subtitle" class="mt-1 text-pl-xs font-medium text-night-muted">
                {{ subtitle }}
              </p>
            </div>
            <button
              type="button"
              class="text-night-muted hover:text-night-text p-1 transition-colors rounded-pl-sm pl-focus-ring cursor-pointer"
              aria-label="Fechar"
              @click="emit('close')"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div class="text-night-body">
            <slot></slot>
          </div>

          <footer v-if="$slots.footer" class="mt-5 flex items-center justify-end gap-3">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transição do overlay (backdrop fade) */
.pl-modal-enter-active,
.pl-modal-leave-active {
  transition: opacity 0.25s ease;
}

.pl-modal-enter-from,
.pl-modal-leave-to {
  opacity: 0;
}

/* Transição do painel (scale + slide sutil) */
.pl-modal-enter-active .pl-modal-content {
  transition:
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease;
}
.pl-modal-leave-active .pl-modal-content {
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease;
}

.pl-modal-enter-from .pl-modal-content {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
.pl-modal-leave-to .pl-modal-content {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
</style>
