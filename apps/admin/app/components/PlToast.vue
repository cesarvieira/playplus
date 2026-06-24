<script setup lang="ts">
import { IconAlertCircle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-vue';
import type { Component } from 'vue';
import type { PlToastVariant } from '~/composables/usePlToast';
import { usePlToast } from '~/composables/usePlToast';

const { toasts, dismiss } = usePlToast();

const variantClasses: Record<PlToastVariant, string> = {
  info: 'border-status-queued-fg/30 bg-status-queued text-status-queued-fg',
  success: 'border-status-ready-fg/30 bg-status-ready text-status-ready-fg',
  error: 'border-status-error-fg/40 bg-status-error text-status-error-fg',
};

const variantIcons: Record<PlToastVariant, Component> = {
  info: IconInfoCircle,
  success: IconCircleCheck,
  error: IconAlertCircle,
};
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      tag="div"
      name="pl-toast"
      class="pointer-events-none fixed top-4 right-4 z-[60] flex flex-col items-end gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-pl-md border px-4 py-3 shadow-pl-elevated"
        :class="variantClasses[toast.variant]"
        role="status"
      >
        <component
          :is="variantIcons[toast.variant]"
          class="size-pl-icon shrink-0"
          aria-hidden="true"
        />
        <span class="flex-1 text-sm font-semibold">{{ toast.message }}</span>
        <button
          type="button"
          class="cursor-pointer rounded-pl-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach-accent"
          :aria-label="`Fechar notificação: ${toast.message}`"
          @click="dismiss(toast.id)"
        >
          <IconX class="size-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>
