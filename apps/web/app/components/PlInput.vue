<script setup lang="ts">
import { IconEye, IconEyeOff } from '@tabler/icons-vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label?: string;
    type?: string;
    placeholder?: string;
    error?: string;
    invalid?: boolean;
    disabled?: boolean;
    id?: string;
    revealable?: boolean;
  }>(),
  {
    modelValue: '',
    label: undefined,
    type: 'text',
    placeholder: undefined,
    error: undefined,
    invalid: false,
    disabled: false,
    id: undefined,
    revealable: false,
  },
);

const hasErrorState = computed(() => Boolean(props.error) || props.invalid);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

defineOptions({
  inheritAttrs: false,
});

const inputId = computed(() => props.id ?? `pl-input-${useId()}`);
const passwordVisible = ref(false);

const resolvedType = computed(() => {
  if (props.type === 'password' && props.revealable && passwordVisible.value) {
    return 'text';
  }

  return props.type;
});

const showRevealToggle = computed(() => props.revealable && props.type === 'password');

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}

function togglePasswordVisibility() {
  passwordVisible.value = !passwordVisible.value;
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
    <div :class="{ 'pl-input-wrap--revealable': showRevealToggle }">
      <input
        :id="inputId"
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="hasErrorState || undefined"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        :class="['pl-input', 'pl-focus-ring', { 'pl-input--error': hasErrorState }]"
        v-bind="$attrs"
        @input="onInput"
      >
      <button
        v-if="showRevealToggle"
        type="button"
        class="pl-input-reveal-btn pl-focus-ring"
        :aria-label="passwordVisible ? 'Ocultar senha' : 'Mostrar senha'"
        :disabled="disabled"
        @click="togglePasswordVisibility"
      >
        <IconEyeOff
          v-if="passwordVisible"
          class="size-pl-icon-md shrink-0"
          aria-hidden="true"
        />
        <IconEye
          v-else
          class="size-pl-icon-md shrink-0"
          aria-hidden="true"
        />
      </button>
    </div>
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
