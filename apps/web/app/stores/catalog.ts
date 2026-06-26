import { defineStore } from 'pinia';

import { parseApiError } from '~/utils/auth';
import {
  buildReadyVideosPath,
  type VideoListItem,
  type VideoListResponse,
} from '~/utils/videos';

type CatalogStatus = 'idle' | 'loading' | 'error' | 'empty';

const DEFAULT_META = { total: 0, page: 1, limit: 20 };

function resolveErrorMessage(error: unknown): string {
  const apiError = parseApiError(error);

  if (apiError?.message) {
    return apiError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocorreu um erro.';
}

export const useCatalogStore = defineStore('catalog', () => {
  const data = ref<VideoListItem[]>([]);
  const meta = ref({ ...DEFAULT_META });
  const status = ref<CatalogStatus>('idle');
  const errorMessage = ref<string | null>(null);

  async function fetchReady(page = 1, limit = 20) {
    status.value = 'loading';
    errorMessage.value = null;

    const { api } = useApi();

    try {
      const response = await api<VideoListResponse>(buildReadyVideosPath(page, limit));

      data.value = response.data;
      meta.value = response.meta;
      status.value = response.meta.total === 0 ? 'empty' : 'idle';
    } catch (error) {
      status.value = 'error';
      errorMessage.value = resolveErrorMessage(error);
    }
  }

  return {
    data,
    meta,
    status,
    errorMessage,
    fetchReady,
  };
});
