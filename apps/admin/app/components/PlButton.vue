<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    variant?: ButtonVariant;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'primary',
    loading: false,
    disabled: false,
  },
);

defineOptions({
  inheritAttrs: false,
});

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-peach-ink text-white hover:bg-peach-ink/90 disabled:opacity-60',
  secondary: 'border border-peach-border bg-peach-input text-peach-ink hover:bg-peach-page',
  ghost: 'bg-transparent text-peach-subtle hover:bg-peach-border-light',
  danger: 'bg-status-error text-status-error-fg hover:opacity-90',
};

const buttonClasses = computed(() => [
  'inline-flex h-pl-btn-lg cursor-pointer items-center justify-center gap-2.5',
  'rounded-pl-btn px-5 text-pl-base font-bold',
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach-accent',
  'disabled:cursor-not-allowed',
  variantClasses[props.variant],
]);
</script>

<template>
  <button :type="type" :disabled="disabled || loading" :class="buttonClasses" v-bind="$attrs">
    <span
      v-if="loading"
      class="size-4.5 shrink-0 animate-pl-spin rounded-full border-2 border-current/35 border-t-current motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
    <slot></slot>
  </button>
</template>
