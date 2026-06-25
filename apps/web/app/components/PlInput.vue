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

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <PlLabel
      v-if="label"
      :html-for="inputId"
    >
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
      :class="['pl-input', 'pl-focus-ring', { 'pl-input--error': Boolean(error) }]"
      v-bind="$attrs"
      @input="onInput"
    >
    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="pl-field-error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
