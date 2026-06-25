<script setup lang="ts">
type ButtonVariant = 'cta' | 'secondary' | 'ghost' | 'icon';

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    variant?: ButtonVariant;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'cta',
    loading: false,
    disabled: false,
  },
);

defineOptions({
  inheritAttrs: false,
});

const variantClasses: Record<ButtonVariant, string> = {
  cta: 'pl-btn--cta',
  secondary: 'pl-btn--secondary',
  ghost: 'pl-btn--ghost',
  icon: 'pl-btn--icon',
};

const buttonClasses = computed(() => [
  'pl-btn',
  variantClasses[props.variant],
  'pl-focus-ring',
]);

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :class="buttonClasses"
    v-bind="$attrs"
  >
    <span
      v-if="loading"
      class="pl-spinner"
      aria-hidden="true"
    ></span>
    <slot></slot>
  </button>
</template>
