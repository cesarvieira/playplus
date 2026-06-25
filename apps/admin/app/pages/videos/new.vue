<script setup lang="ts">
import { IconArrowLeft } from '@tabler/icons-vue';
import { usePlToast } from '~/composables/usePlToast';
import { useUpload } from '~/composables/useUpload';

definePageMeta({
  layout: 'default',
});

const upload = useUpload();
const { state, isModalOpen, start, cancel, retry, reset } = upload;
const { show } = usePlToast();

const isFormDisabled = computed(
  () =>
    state.phase === 'registering' ||
    state.phase === 'uploading' ||
    state.phase === 'enqueueing_transcode',
);

watch(
  () => state.phase,
  (phase) => {
    if (phase !== 'success') {
      return;
    }

    const title = state.title;
    reset();
    show(`"${title}" foi enviado e a transcodificação foi iniciada.`, 'success', 5000);
    navigateTo('/videos');
  },
);

function onSubmit(payload: { title: string; file: File }) {
  start(payload);
}

function onModalClose() {
  reset();
}
</script>

<template>
  <section class="pl-page-section">
    <header class="mb-8">
      <NuxtLink to="/videos" class="pl-back-link pl-focus-ring">
        <IconArrowLeft :size="16" stroke="2" aria-hidden="true" />
        Voltar
      </NuxtLink>
      <h1 class="pl-page-title">
        Novo vídeo
      </h1>
      <p class="pl-page-lead">
        Envie um arquivo de vídeo para o catálogo. A transcodificação começa automaticamente após o envio.
      </p>
    </header>

    <UploadForm :disabled="isFormDisabled" @submit="onSubmit" />

    <UploadModal
      :open="isModalOpen"
      :phase="state.phase"
      :progress="state.progress"
      :bytes-loaded="state.bytesLoaded"
      :file-name="state.file?.name ?? null"
      :file-size="state.file?.size ?? 0"
      :error-kind="state.errorKind"
      :error-message="state.errorMessage"
      @cancel="cancel"
      @retry="retry"
      @close="onModalClose"
    />
  </section>
</template>
