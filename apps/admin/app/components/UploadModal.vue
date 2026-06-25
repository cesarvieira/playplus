<script setup lang="ts">
import { IconAlertTriangle, IconInfoCircle, IconRefresh } from '@tabler/icons-vue';
import type { UploadErrorKind, UploadPhase } from '~/composables/useUpload';
import { formatBytes } from '~/utils/format';
import {
  buildEnqueueTranscodeProgressLabel,
  buildEnqueueTranscodeProgressValueText,
  buildUploadProgressLabel,
  buildUploadProgressValueText,
} from '~/utils/upload';

const props = defineProps<{
  open: boolean;
  phase: UploadPhase;
  progress: number;
  bytesLoaded: number;
  fileName: string | null;
  fileSize: number;
  errorKind: UploadErrorKind;
  errorMessage: string | null;
}>();

const emit = defineEmits<{
  cancel: [];
  retry: [];
  close: [];
}>();

const isRegisteringOrUploading = computed(
  () => props.phase === 'uploading' || props.phase === 'registering',
);
const isEnqueueingTranscode = computed(() => props.phase === 'enqueueing_transcode');
const isBusy = computed(() => isRegisteringOrUploading.value || isEnqueueingTranscode.value);
const isError = computed(() => props.phase === 'error');
const showRetry = computed(
  () => isError.value && props.errorKind !== 'aborted' && props.errorKind !== 'register',
);

const modalTitle = computed(() => {
  if (isError.value) {
    return props.errorKind === 'transcode' ? 'Falha na transcodificação' : 'Falha no envio';
  }

  if (isEnqueueingTranscode.value) {
    return 'Finalizando envio';
  }

  return 'Enviando vídeo';
});

const modalSubtitle = computed(() => {
  if (isRegisteringOrUploading.value) {
    return 'Não feche a aba enquanto envia.';
  }

  if (isEnqueueingTranscode.value) {
    return 'Aguarde enquanto a transcodificação é enfileirada.';
  }

  return undefined;
});

const progressLabel = computed(() => {
  if (isEnqueueingTranscode.value) {
    return buildEnqueueTranscodeProgressLabel();
  }

  return buildUploadProgressLabel(props.progress);
});

const progressValueText = computed(() => {
  if (isEnqueueingTranscode.value) {
    return buildEnqueueTranscodeProgressValueText(props.fileSize);
  }

  return buildUploadProgressValueText(props.progress, props.bytesLoaded, props.fileSize);
});

function onModalClose() {
  if (isBusy.value) {
    return;
  }

  emit('close');
}
</script>

<template>
  <PlModal
    :open="open"
    :title="modalTitle"
    :subtitle="modalSubtitle"
    :close-on-backdrop="!isBusy"
    :close-on-escape="!isBusy"
    @close="onModalClose"
  >
    <div aria-live="polite" aria-atomic="true">
      <div v-if="isError" class="pl-modal-error">
        <div class="pl-modal-error__icon" aria-hidden="true">
          <IconAlertTriangle class="size-pl-icon-md" stroke="2" />
        </div>
        <p class="pl-modal-error__message">
          {{ errorMessage }}
        </p>
      </div>

      <div v-else class="pl-modal-file">
        <div class="pl-media-thumb" aria-hidden="true">
          <div class="pl-play-glyph"></div>
        </div>
        <div class="min-w-0 flex-1">
          <p class="pl-modal-file__name">
            {{ fileName ?? 'Preparando envio…' }}
          </p>
          <p class="pl-modal-file__meta">
            {{ formatBytes(fileSize) }}
            <span v-if="isRegisteringOrUploading"> · enviando…</span>
            <span v-else-if="isEnqueueingTranscode"> · envio concluído</span>
          </p>
        </div>
      </div>

      <PlProgressBar
        v-if="isBusy || (isError && progress > 0)"
        :value="progress"
        :label="isError ? `Interrompido em ${Math.round(progress)}%` : progressLabel"
        :label-class="isError ? 'text-status-error-fg' : 'text-status-processing-fg'"
        :value-text="progressValueText"
        :show-value="false"
      >
        <template v-if="isBusy && !isError" #label>
          {{ progressLabel }}
        </template>
      </PlProgressBar>

      <p
        v-if="isRegisteringOrUploading"
        class="pl-modal-bytes"
        aria-hidden="true"
      >
        {{ formatBytes(bytesLoaded) }} / {{ formatBytes(fileSize) }}
      </p>
      <p
        v-else-if="isEnqueueingTranscode"
        class="pl-modal-bytes"
        aria-hidden="true"
      >
        {{ formatBytes(fileSize) }} enviados
      </p>
    </div>

    <div v-if="isRegisteringOrUploading" class="pl-upload-notice">
      <IconInfoCircle class="pl-upload-notice__icon" stroke="2" aria-hidden="true" />
      <span class="pl-upload-notice__text">
        O arquivo vai direto ao armazenamento — não passa pelo servidor.
      </span>
    </div>

    <template #footer>
      <span
        v-if="isRegisteringOrUploading"
        class="pl-modal-footnote mr-auto"
      >
        O registro permanece se cancelar.
      </span>

      <PlButton
        v-if="showRetry"
        variant="primary"
        class="shrink-0"
        @click="emit('retry')"
      >
        <IconRefresh :size="16" stroke="2.2" aria-hidden="true" />
        Tentar novamente
      </PlButton>

      <PlButton
        v-if="isError && !showRetry"
        variant="secondary"
        class="shrink-0"
        @click="emit('close')"
      >
        Fechar
      </PlButton>

      <PlButton
        v-if="isRegisteringOrUploading"
        variant="danger"
        class="shrink-0"
        @click="emit('cancel')"
      >
        Cancelar envio
      </PlButton>

      <PlButton
        v-if="isError && showRetry"
        variant="secondary"
        class="shrink-0"
        @click="emit('close')"
      >
        Cancelar
      </PlButton>
    </template>
  </PlModal>
</template>
