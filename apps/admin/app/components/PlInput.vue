<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label?: string;
    type?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    id?: string;
  }>(),
  {
    modelValue: '',
    label: undefined,
    type: 'text',
    placeholder: undefined,
    error: undefined,
    disabled: false,
    id: undefined,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

defineOptions({
  inheritAttrs: false,
});

const inputId = computed(() => props.id ?? `pl-input-${useId()}`);

const inputClasses = computed(() => [
  'h-pl-input w-full rounded-pl-md border-pl bg-peach-input px-4 text-pl-base text-peach-ink',
  'placeholder:text-peach-muted',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach-accent',
  'disabled:cursor-not-allowed disabled:opacity-60',
  props.error ? 'border-status-error-fg/60' : 'border-peach-border',
]);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <PlLabel v-if="label" :html-for="inputId">
      {{ label }}
    </PlLabel>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="Boolean(error) || undefined"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :class="inputClasses"
      v-bind="$attrs"
      @input="onInput"
    >
    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="text-sm font-medium text-status-error-fg"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
