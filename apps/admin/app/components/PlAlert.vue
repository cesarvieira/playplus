<script setup lang="ts">
import { IconAlertCircle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-vue';
import type { Component } from 'vue';

type AlertVariant = 'error' | 'info' | 'success';

withDefaults(
  defineProps<{
    variant?: AlertVariant;
    dismissible?: boolean;
  }>(),
  {
    variant: 'error',
    dismissible: true,
  },
);

const emit = defineEmits<{
  dismiss: [];
}>();

const visible = ref(true);

const variantClasses: Record<AlertVariant, string> = {
  error: 'border-status-error-fg/40 bg-status-error text-status-error-fg',
  info: 'border-status-queued-fg/30 bg-status-queued text-status-queued-fg',
  success: 'border-status-ready-fg/30 bg-status-ready text-status-ready-fg',
};

const variantIcons: Record<AlertVariant, Component> = {
  error: IconAlertCircle,
  info: IconInfoCircle,
  success: IconCircleCheck,
};

function dismiss() {
  visible.value = false;
  emit('dismiss');
}
</script>

<template>
  <Transition name="pl-alert">
    <div
      v-if="visible"
      class="flex items-center gap-2.5 rounded-pl-md border px-4 py-3"
      :class="variantClasses[variant]"
      role="alert"
    >
      <component
        :is="variantIcons[variant]"
        class="size-pl-icon shrink-0"
        aria-hidden="true"
      />
      <div class="flex-1 text-sm font-semibold">
        <slot></slot>
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="cursor-pointer rounded-pl-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach-accent"
        aria-label="Fechar alerta"
        @click="dismiss"
      >
        <IconX class="size-4" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>
