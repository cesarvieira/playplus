<script setup lang="ts">
withDefaults(
  defineProps<{
    enabled?: boolean;
    open?: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
  }>(),
  {
    enabled: false,
    open: false,
    title: 'Excluir vídeo?',
    message: 'Esta ação é irreversível. O vídeo e os arquivos associados serão removidos.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    loading: false,
  },
);

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <PlModal
    v-if="enabled"
    :open="open"
    :title="title"
    :subtitle="message"
    @close="emit('close')"
  >
    <div class="mt-6 flex justify-end gap-3">
      <PlButton
        variant="secondary"
        size="sm"
        :disabled="loading"
        @click="emit('close')"
      >
        {{ cancelLabel }}
      </PlButton>
      <PlButton
        variant="danger"
        size="sm"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </PlButton>
    </div>
  </PlModal>
</template>
