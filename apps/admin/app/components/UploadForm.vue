<script setup lang="ts">
import { IconUpload } from '@tabler/icons-vue';
import { formatBytes } from '~/utils/format';
import { MAX_UPLOAD_BYTES, validateUploadFile } from '~/utils/upload';

const emit = defineEmits<{
  submit: [payload: { title: string; file: File }];
}>();

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const title = ref('');
const selectedFile = ref<File | null>(null);
const titleError = ref<string | null>(null);
const fileError = ref<string | null>(null);
const isDragging = ref(false);

const fileInputRef = ref<HTMLInputElement | null>(null);

const canSubmit = computed(
  () => !props.disabled && title.value.trim().length > 0 && selectedFile.value !== null,
);

function clearErrors() {
  titleError.value = null;
  fileError.value = null;
}

function setFile(file: File | null) {
  clearErrors();

  if (!file) {
    selectedFile.value = null;
    return;
  }

  const validation = validateUploadFile(file);

  if (!validation.ok) {
    fileError.value = validation.message;
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  setFile(file);
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  const file = event.dataTransfer?.files?.[0] ?? null;
  setFile(file);
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function onSubmit() {
  clearErrors();

  const trimmedTitle = title.value.trim();

  if (trimmedTitle.length === 0) {
    titleError.value = 'Informe o título do vídeo.';
    return;
  }

  const validation = validateUploadFile(selectedFile.value);

  if (!validation.ok) {
    fileError.value = validation.message;
    return;
  }

  emit('submit', { title: trimmedTitle, file: selectedFile.value! });
}
</script>

<template>
  <form class="flex flex-col gap-6" @submit.prevent="onSubmit">
    <PlInput
      v-model="title"
      label="Título"
      :error="titleError ?? undefined"
      :disabled="disabled"
      autocomplete="off"
    />

    <div class="flex flex-col gap-2">
      <PlLabel>Arquivo de vídeo</PlLabel>
      <div
        role="button"
        tabindex="0"
        class="pl-dropzone pl-focus-ring"
        :class="{ 'pl-dropzone--active': isDragging }"
        @click="openFilePicker"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <div class="pl-dropzone__icon" aria-hidden="true">
          <IconUpload :size="24" stroke="2" />
        </div>
        <div class="text-center">
          <p class="pl-dropzone__title">
            Arraste um vídeo ou clique para selecionar
          </p>
          <p class="pl-dropzone__hint">
            Máximo {{ formatBytes(MAX_UPLOAD_BYTES) }}
          </p>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="video/*"
          class="sr-only"
          :disabled="disabled"
          @change="onFileInputChange"
        >
      </div>

      <div v-if="selectedFile" class="pl-file-chip">
        <div class="pl-file-chip__icon" aria-hidden="true">
          <IconUpload :size="18" stroke="2" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="pl-file-chip__name">
            {{ selectedFile.name }}
          </p>
          <p class="pl-text-muted">
            {{ formatBytes(selectedFile.size) }}
          </p>
        </div>
      </div>

      <p
        v-if="fileError"
        class="pl-text-error"
        role="alert"
      >
        {{ fileError }}
      </p>
    </div>

    <PlButton type="submit" :disabled="!canSubmit" :loading="disabled">
      Enviar vídeo
    </PlButton>
  </form>
</template>
