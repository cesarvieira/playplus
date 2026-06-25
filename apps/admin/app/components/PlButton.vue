<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'lg' | 'sm';

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    variant?: ButtonVariant;
    size?: ButtonSize;
    to?: string;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'primary',
    size: 'lg',
    to: undefined,
    loading: false,
    disabled: false,
  },
);

defineOptions({
  inheritAttrs: false,
});

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-peach-ink text-peach-surface hover:bg-peach-ink-hover disabled:opacity-60',
  secondary: 'border border-peach-border bg-peach-input text-peach-ink hover:bg-peach-page',
  ghost: 'bg-transparent text-peach-subtle hover:bg-peach-border-light',
  danger: 'bg-status-error text-status-error-fg hover:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: 'h-pl-btn-lg rounded-pl-btn px-5 text-pl-base gap-2.5',
  sm: 'h-pl-btn-sm rounded-full px-5 text-pl-sm gap-2',
};

const buttonClasses = computed(() => [
  'inline-flex cursor-pointer items-center justify-center font-bold',
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach-accent',
  'disabled:cursor-not-allowed',
  sizeClasses[props.size],
  variantClasses[props.variant],
]);

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="[buttonClasses, { 'pointer-events-none opacity-60': isDisabled }]"
    :aria-disabled="isDisabled || undefined"
    :tabindex="isDisabled ? -1 : undefined"
    v-bind="$attrs"
  >
    <span
      v-if="loading"
      class="size-pl-icon-sm shrink-0 animate-pl-spin rounded-full border-2 border-current/35 border-t-current motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
    <slot></slot>
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :class="buttonClasses"
    v-bind="$attrs"
  >
    <span
      v-if="loading"
      class="size-pl-icon-sm shrink-0 animate-pl-spin rounded-full border-2 border-current/35 border-t-current motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
    <slot></slot>
  </button>
</template>
