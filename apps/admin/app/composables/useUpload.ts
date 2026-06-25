import { computed, onUnmounted, reactive, readonly } from 'vue';
import type { XhrUploadHandle } from '~/utils/upload-xhr';
import {
  UploadAbortedError,
  UploadHttpError,
  putFileWithProgress,
} from '~/utils/upload-xhr';
import {
  PRESIGNED_EXPIRED_MESSAGE,
  UPLOAD_NETWORK_ERROR_MESSAGE,
  isPresignedUrlExpired,
  validateUploadFile,
} from '~/utils/upload';
import { useApi } from '~/composables/useApi';
import { parseApiError } from '~/utils/auth';
import { resolveErrorMessage } from '~/utils/error-messages';
import type {
  ApiCreateVideoResponse,
  ApiEnqueueTranscodeResponse,
  ApiRenewUploadUrlResponse,
} from '~/utils/videos';

export type UploadPhase =
  'idle' |
  'registering' |
  'uploading' |
  'enqueueing_transcode' |
  'success' |
  'error';

export type UploadErrorKind =
  'network' |
  'aborted' |
  'presigned_expired' |
  'register' |
  'transcode' |
  null;

export interface UploadStartInput {
  title: string;
  file: File;
}

export interface UploadState {
  phase: UploadPhase;
  progress: number;
  bytesLoaded: number;
  file: File | null;
  title: string;
  videoId: string | null;
  uploadUrl: string | null;
  errorKind: UploadErrorKind;
  errorMessage: string | null;
}

function createInitialState(): UploadState {
  return {
    phase: 'idle',
    progress: 0,
    bytesLoaded: 0,
    file: null,
    title: '',
    videoId: null,
    uploadUrl: null,
    errorKind: null,
    errorMessage: null,
  };
}

export function useUpload() {
  const { api } = useApi();

  const state = reactive<UploadState>(createInitialState());

  let activeUpload: XhrUploadHandle | null = null;
  let userAborted = false;

  function setUploadProgress(loaded: number, total: number) {
    state.bytesLoaded = loaded;
    state.progress = total > 0 ? (loaded / total) * 100 : 0;
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    event.preventDefault();
    event.returnValue = '';
  }

  function registerBeforeUnloadGuard() {
    if (import.meta.client) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
  }

  function unregisterBeforeUnloadGuard() {
    if (import.meta.client) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }

  async function registerVideo(title: string, file: File): Promise<ApiCreateVideoResponse> {
    return api<ApiCreateVideoResponse>('/videos', {
      method: 'POST',
      body: {
        title: title.trim(),
        file_name: file.name,
        file_size: file.size,
      },
    });
  }

  async function renewUploadUrl(videoId: string): Promise<string> {
    const response = await api<ApiRenewUploadUrlResponse>(`/videos/${videoId}/upload-url`, {
      method: 'POST',
    });

    return response.upload_url;
  }

  function setUploadError(kind: UploadErrorKind, message: string) {
    state.phase = 'error';
    state.errorKind = kind;
    state.errorMessage = message;
    unregisterBeforeUnloadGuard();
    activeUpload = null;
  }

  async function enqueueTranscode() {
    if (!state.videoId) {
      setUploadError('transcode', 'Não foi possível iniciar a transcodificação.');
      return;
    }

    state.phase = 'enqueueing_transcode';
    state.progress = 100;

    try {
      await api<ApiEnqueueTranscodeResponse>(`/videos/${state.videoId}/transcode`, {
        method: 'POST',
      });

      try {
        await refreshNuxtData('admin-videos');
      } catch {
        // A lista será atualizada no próximo acesso se o refresh falhar.
      }

      state.phase = 'success';
    } catch (error) {
      const apiError = parseApiError(error);
      const message = apiError
        ? resolveErrorMessage(apiError.code, 'default', apiError.message)
        : 'Não foi possível iniciar a transcodificação.';
      setUploadError('transcode', message);
    }
  }

  async function performUpload(uploadUrl: string, file: File) {
    state.phase = 'uploading';
    state.progress = 0;
    state.bytesLoaded = 0;
    state.uploadUrl = uploadUrl;
    userAborted = false;
    registerBeforeUnloadGuard();

    const handle = putFileWithProgress({
      url: uploadUrl,
      file,
      onProgress: (event) => {
        setUploadProgress(event.loaded, event.total);
      },
    });

    activeUpload = handle;

    try {
      await handle.promise;
      unregisterBeforeUnloadGuard();
      activeUpload = null;
      state.progress = 100;
      state.bytesLoaded = file.size;
      await enqueueTranscode();
    } catch (error) {
      unregisterBeforeUnloadGuard();
      activeUpload = null;

      if (userAborted) {
        return;
      }

      if (error instanceof UploadAbortedError) {
        setUploadError('aborted', 'Envio cancelado.');
        return;
      }

      if (error instanceof UploadHttpError) {
        if (isPresignedUrlExpired(error.status)) {
          setUploadError('presigned_expired', PRESIGNED_EXPIRED_MESSAGE);
          return;
        }

        setUploadError('network', UPLOAD_NETWORK_ERROR_MESSAGE);
        return;
      }

      setUploadError('network', UPLOAD_NETWORK_ERROR_MESSAGE);
    }
  }

  async function start(input: UploadStartInput) {
    const validation = validateUploadFile(input.file);

    if (!validation.ok) {
      state.phase = 'error';
      state.errorKind = 'register';
      state.errorMessage = validation.message;
      return;
    }

    const trimmedTitle = input.title.trim();

    if (trimmedTitle.length === 0) {
      state.phase = 'error';
      state.errorKind = 'register';
      state.errorMessage = 'Informe o título do vídeo.';
      return;
    }

    state.file = input.file;
    state.title = trimmedTitle;
    state.phase = 'registering';
    state.errorKind = null;
    state.errorMessage = null;
    state.progress = 0;
    state.bytesLoaded = 0;

    try {
      const response = await registerVideo(trimmedTitle, input.file);
      state.videoId = response.id;
      await performUpload(response.upload_url, input.file);
    } catch (error) {
      const apiError = parseApiError(error);
      const message = apiError
        ? resolveErrorMessage(apiError.code, 'default', apiError.message)
        : 'Não foi possível registrar o vídeo. Tente novamente.';

      setUploadError('register', message);
    }
  }

  function cancel() {
    userAborted = true;
    activeUpload?.abort();
    activeUpload = null;
    unregisterBeforeUnloadGuard();

    if (state.phase === 'uploading' || state.phase === 'registering') {
      state.phase = 'idle';
      state.errorKind = 'aborted';
      state.errorMessage = null;
      state.progress = 0;
      state.bytesLoaded = 0;
    }
  }

  async function retry() {
    const file = state.file;
    const videoId = state.videoId;
    const previousErrorKind = state.errorKind;

    if (previousErrorKind === 'transcode') {
      state.errorKind = null;
      state.errorMessage = null;
      await enqueueTranscode();
      return;
    }

    if (!file) {
      return;
    }

    state.errorKind = null;
    state.errorMessage = null;
    state.progress = 0;
    state.bytesLoaded = 0;

    try {
      let uploadUrl = state.uploadUrl;

      if (previousErrorKind === 'presigned_expired') {
        if (!videoId) {
          setUploadError('network', UPLOAD_NETWORK_ERROR_MESSAGE);
          return;
        }

        state.phase = 'registering';
        uploadUrl = await renewUploadUrl(videoId);
        state.uploadUrl = uploadUrl;
      }

      if (!uploadUrl) {
        setUploadError('network', UPLOAD_NETWORK_ERROR_MESSAGE);
        return;
      }

      await performUpload(uploadUrl, file);
    } catch (error) {
      const apiError = parseApiError(error);
      const message = apiError
        ? resolveErrorMessage(apiError.code, 'default', apiError.message)
        : UPLOAD_NETWORK_ERROR_MESSAGE;

      setUploadError('network', message);
    }
  }

  function reset() {
    userAborted = false;
    activeUpload?.abort();
    activeUpload = null;
    unregisterBeforeUnloadGuard();
    Object.assign(state, createInitialState());
  }

  const isModalOpen = computed(
    () =>
      state.phase === 'registering' ||
      state.phase === 'uploading' ||
      state.phase === 'enqueueing_transcode' ||
      state.phase === 'error',
  );

  onUnmounted(() => {
    activeUpload?.abort();
    unregisterBeforeUnloadGuard();
  });

  return {
    state: readonly(state),
    isModalOpen,
    start,
    cancel,
    retry,
    reset,
  };
}
