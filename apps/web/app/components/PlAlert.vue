<script setup lang="ts">
import { IconAlertCircle, IconInfoCircle, IconX } from '@tabler/icons-vue';
import type { Component } from 'vue';

type AlertVariant = 'error' | 'info';

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
  error: 'pl-feedback-error',
  info: 'pl-feedback-info',
};

const variantIcons: Record<AlertVariant, Component> = {
  error: IconAlertCircle,
  info: IconInfoCircle,
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
      :class="variantClasses[variant]"
      role="alert"
    >
      <component
        :is="variantIcons[variant]"
        class="size-pl-icon shrink-0"
        aria-hidden="true"
      />
      <div class="flex-1">
        <slot></slot>
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="pl-alert-dismiss pl-focus-ring"
        aria-label="Fechar alerta"
        @click="dismiss"
      >
        <IconX
          class="size-pl-icon-sm"
          aria-hidden="true"
        />
      </button>
    </div>
  </Transition>
</template>
