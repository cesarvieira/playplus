<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    subtitle?: string;
    closeOnBackdrop?: boolean;
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    closeOnBackdrop: true,
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
  if (event.key === 'Escape' && props.open) {
    emit('close');
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown);
    } else {
      document.removeEventListener('keydown', onKeydown);
    }
  },
);

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-peach-ink/45 p-4"
      @click.self="onBackdropClick"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="w-full max-w-md rounded-pl-xl bg-peach-surface p-6 shadow-pl-modal"
      >
        <header v-if="$slots.title || title" class="mb-5">
          <h2 :id="titleId" class="text-lg font-extrabold text-peach-ink">
            <slot name="title">
              {{ title }}
            </slot>
          </h2>
          <p v-if="subtitle" class="mt-1 text-xs font-medium text-peach-muted">
            {{ subtitle }}
          </p>
        </header>

        <div class="text-peach-subtle">
          <slot></slot>
        </div>

        <footer v-if="$slots.footer" class="mt-5 flex items-center justify-end gap-3">
          <slot name="footer"></slot>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
