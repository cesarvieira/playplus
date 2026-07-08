<script setup lang="ts">
import {
  assertScheduleDateIsFuture,
  datetimeLocalToIso,
  toDatetimeLocalValue,
} from '~/utils/video-publication';

const props = defineProps<{
  open: boolean;
  loading?: boolean;
  videoTitle?: string;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [publishedAt: string];
}>();

const defaultDate = computed(() => {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return toDatetimeLocalValue(nextHour);
});

const datetimeValue = ref('');
const error = ref<string | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      datetimeValue.value = defaultDate.value;
      error.value = null;
    }
  },
);

function onClose() {
  emit('close');
}

function onConfirm() {
  const isoDate = datetimeLocalToIso(datetimeValue.value);
  const validationError = assertScheduleDateIsFuture(isoDate);

  if (validationError) {
    error.value = validationError;
    return;
  }

  error.value = null;
  emit('confirm', isoDate);
}

function onInput(value: string) {
  datetimeValue.value = value;

  if (error.value) {
    error.value = assertScheduleDateIsFuture(datetimeLocalToIso(value));
  }
}
</script>

<template>
  <PlModal
    :open="open"
    title="Agendar publicação"
    :subtitle="videoTitle ? `Vídeo: ${videoTitle}` : undefined"
    @close="onClose"
  >
    <PlInput
      :model-value="datetimeValue"
      type="datetime-local"
      label="Data e hora"
      :error="error ?? undefined"
      :disabled="loading"
      @update:model-value="onInput"
    />

    <template #footer>
      <PlButton
        variant="secondary"
        size="sm"
        :disabled="loading"
        @click="onClose"
      >
        Cancelar
      </PlButton>
      <PlButton
        size="sm"
        :loading="loading"
        @click="onConfirm"
      >
        Confirmar
      </PlButton>
    </template>
  </PlModal>
</template>
