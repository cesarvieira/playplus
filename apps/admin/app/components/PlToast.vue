<script setup lang="ts">
import { IconAlertCircle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-vue';
import type { Component } from 'vue';
import type { PlToastVariant } from '~/composables/usePlToast';
import { usePlToast } from '~/composables/usePlToast';

const { toasts, dismiss } = usePlToast();

const variantModifiers: Record<PlToastVariant, string> = {
  info: 'pl-toast--info',
  success: 'pl-toast--success',
  error: 'pl-toast--error',
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
      class="pl-toast-host"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pl-toast"
        :class="variantModifiers[toast.variant]"
        role="status"
      >
        <component
          :is="variantIcons[toast.variant]"
          class="size-pl-icon shrink-0"
          aria-hidden="true"
        />
        <span class="flex-1">{{ toast.message }}</span>
        <button
          type="button"
          class="pl-toast__close"
          :aria-label="`Fechar notificação: ${toast.message}`"
          @click="dismiss(toast.id)"
        >
          <IconX class="pl-toast__close-icon" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>
