import { ref, watch, toValue, type MaybeRefOrGetter } from 'vue';
import type { VideoStatus } from '@playplus/shared';
import { useApi } from './useApi';
import { parseApiError } from '~/utils/auth';

/** @public */
export interface VideoDetail {
  id: string;
  title: string;
  duration: number | null;
  thumbnail_url: string | null;
  stream_url?: string;
  status: VideoStatus;
  progress?: {
    position: number;
    updated_at: string;
  } | null;
  created_at: string;
}

type VideoDetailStatus =
  | 'loading' |
  'ready' |
  'unavailable_processing' |
  'unavailable_queued' |
  'unavailable_error' |
  'not_found' |
  'error_api';

export function useVideoDetail(videoId: MaybeRefOrGetter<string>) {
  const { api } = useApi();
  const video = ref<VideoDetail | null>(null);
  const status = ref<VideoDetailStatus>('loading');
  const errorMessage = ref<string | null>(null);

  async function fetchVideo() {
    status.value = 'loading';
    errorMessage.value = null;
    const id = toValue(videoId);

    try {
      const response = await api<VideoDetail>(`/videos/${id}`);
      video.value = response;

      if (response.status === 'ready') {
        status.value = 'ready';
      } else if (response.status === 'queued') {
        status.value = 'unavailable_queued';
      } else if (response.status === 'processing' || response.status === 'pending') {
        status.value = 'unavailable_processing';
      } else if (response.status === 'error') {
        status.value = 'unavailable_error';
      } else {
        status.value = 'error_api';
        errorMessage.value = 'Status do vídeo desconhecido.';
      }
    } catch (err: unknown) {
      video.value = null;
      const errorObject = err as { statusCode?: number; message?: string } | null;
      if (errorObject?.statusCode === 409) {
        status.value = 'unavailable_processing';
      } else if (errorObject?.statusCode === 404) {
        status.value = 'not_found';
      } else {
        status.value = 'error_api';
        const parsed = parseApiError(err);
        errorMessage.value = parsed?.message ?? errorObject?.message ?? 'Erro ao carregar vídeo';
      }
    }
  }

  // Fetch immediately on initialization
  void fetchVideo();

  watch(
    () => toValue(videoId),
    () => {
      void fetchVideo();
    },
  );

  return {
    video,
    status,
    errorMessage,
    fetchVideo,
  };
}
