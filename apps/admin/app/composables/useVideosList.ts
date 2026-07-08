import { computed, onMounted, readonly, ref, watch, type ComputedRef, type Ref } from 'vue';

import { useApi } from '~/composables/useApi';
import { usePlToast } from '~/composables/usePlToast';
import { useVideoStatusWs } from '~/composables/useVideoStatusWs';
import { parseApiError } from '~/utils/auth';
import { resolveErrorMessage } from '~/utils/error-messages';
import {
  type ApiEnqueueTranscodeResponse,
  type ApiListVideosResponse,
  type ApiPublicationResponse,
  buildVideosListPath,
  filterActiveVideos,
  mergeVideoRow,
  type DisplayVideoRow,
  type VideoListFilter,
  type VideoPublicationPatch,
} from '~/utils/videos';

const LIST_REFRESH_DEBOUNCE_MS = 500;
const CLIENT_ONLY = { server: false, immediate: false } as const;

export interface UseVideosListReturn {
  filter: Ref<VideoListFilter>;
  page: Ref<number>;
  limit: Ref<number>;
  mergedRows: ComputedRef<DisplayVideoRow[]>;
  meta: ComputedRef<ApiListVideosResponse['meta']>;
  totalPages: ComputedRef<number>;
  isLoading: ComputedRef<boolean>;
  error: Ref<unknown>;
  refresh: () => Promise<void>;
  isEmpty: ComputedRef<boolean>;
  subtitle: ComputedRef<string>;
  transcodeLoadingId: Readonly<Ref<string | null>>;
  enqueueTranscode: (videoId: string) => Promise<void>;
  publicationLoadingId: Readonly<Ref<string | null>>;
  publishVideo: (videoId: string) => Promise<void>;
  scheduleVideo: (videoId: string, publishedAt: string) => Promise<void>;
  unpublishVideo: (videoId: string) => Promise<void>;
  setFilter: (nextFilter: VideoListFilter) => void;
  goToPage: (nextPage: number) => void;
}

export function useVideosList(): UseVideosListReturn {
  const { api } = useApi();
  const { show } = usePlToast();
  const { patches } = useVideoStatusWs();

  const filter = ref<VideoListFilter>('all');
  const page = ref(1);
  const limit = ref(20);
  const transcodeLoadingId = ref<string | null>(null);
  const publicationLoadingId = ref<string | null>(null);
  const publicationPatches = ref<Record<string, VideoPublicationPatch>>({});

  const listAsync = useLazyAsyncData(
    'videos-list',
    () => api<ApiListVideosResponse>(buildVideosListPath(filter.value, page.value, limit.value)),
    CLIENT_ONLY,
  );

  const statsAsync = useLazyAsyncData(
    'videos-stats',
    () => api<ApiListVideosResponse>('/videos?limit=100&include_unpublished=true'),
    CLIENT_ONLY,
  );

  const { data, pending, error, refresh: refreshListData, execute: executeList } = listAsync;
  const { data: statsData, refresh: refreshStatsData, execute: executeStats } = statsAsync;

  const isLoading = computed(() => {
    if (import.meta.server) {
      return true;
    }

    if (pending.value) {
      return true;
    }

    if (error.value) {
      return false;
    }

    return data.value === undefined;
  });

  async function loadVideos() {
    await Promise.all([executeList(), executeStats()]);
  }

  async function refresh() {
    await Promise.all([refreshListData(), refreshStatsData()]);
  }

  onMounted(() => {
    void loadVideos();
  });

  watch([filter, page], () => {
    if (import.meta.client && data.value !== undefined) {
      void refreshListData();
    }
  });

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedRefresh() {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refresh();
    }, LIST_REFRESH_DEBOUNCE_MS);
  }

  watch(
    patches,
    (nextPatches, previousPatches) => {
      for (const [videoId, patch] of Object.entries(nextPatches)) {
        const previousStatus = previousPatches[videoId]?.status;
        if (
          (patch.status === 'ready' || patch.status === 'error') &&
          patch.status !== previousStatus
        ) {
          debouncedRefresh();
        }
      }
    },
    { deep: true },
  );

  const mergedRows = computed(() => {
    const items = data.value?.data ?? [];
    const rows = items.map(item =>
      mergeVideoRow(
        item,
        patches.value[item.id],
        publicationPatches.value[item.id],
      ),
    );

    if (filter.value === 'active') {
      return filterActiveVideos(rows);
    }

    return rows;
  });

  const meta = computed(() => data.value?.meta ?? { total: 0, page: 1, limit: 20 });

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(meta.value.total / meta.value.limit)),
  );

  const isEmpty = computed(
    () => data.value !== undefined && !pending.value && !error.value && mergedRows.value.length === 0,
  );

  const subtitle = computed(() => {
    const total = meta.value.total;
    const videoWord = total === 1 ? 'vídeo' : 'vídeos';

    if (!statsData.value || statsData.value.meta.total > 100) {
      return `${total} ${videoWord}`;
    }

    let queued = 0;
    let processing = 0;

    for (const item of statsData.value.data) {
      const row = mergeVideoRow(
        item,
        patches.value[item.id],
        publicationPatches.value[item.id],
      );
      if (row.status === 'queued') {
        queued += 1;
      }
      if (row.status === 'processing') {
        processing += 1;
      }
    }

    return `${total} ${videoWord} · ${queued} na fila, ${processing} transcodificando`;
  });

  async function enqueueTranscode(videoId: string) {
    transcodeLoadingId.value = videoId;

    try {
      await api<ApiEnqueueTranscodeResponse>(`/videos/${videoId}/transcode`, {
        method: 'POST',
      });
      await refreshListData();
    } catch (err) {
      const apiError = parseApiError(err);
      show(
        resolveErrorMessage(apiError?.code, 'default', apiError?.message),
        'error',
      );
    } finally {
      transcodeLoadingId.value = null;
    }
  }

  function applyPublicationPatch(videoId: string, publishedAt: string | null) {
    publicationPatches.value = {
      ...publicationPatches.value,
      [videoId]: { published_at: publishedAt },
    };
  }

  async function runPublicationAction(
    videoId: string,
    request: () => Promise<ApiPublicationResponse>,
    successMessage: string,
  ) {
    publicationLoadingId.value = videoId;

    try {
      const response = await request();
      applyPublicationPatch(videoId, response.published_at);
      show(successMessage, 'success');
    } catch (err) {
      const apiError = parseApiError(err);
      show(
        resolveErrorMessage(apiError?.code, 'default', apiError?.message),
        'error',
      );
    } finally {
      publicationLoadingId.value = null;
    }
  }

  async function publishVideo(videoId: string) {
    await runPublicationAction(
      videoId,
      () => api<ApiPublicationResponse>(`/videos/${videoId}/publish`, { method: 'PATCH' }),
      'Vídeo publicado.',
    );
  }

  async function scheduleVideo(videoId: string, publishedAt: string) {
    await runPublicationAction(
      videoId,
      () =>
        api<ApiPublicationResponse>(`/videos/${videoId}/schedule`, {
          method: 'PATCH',
          body: { published_at: publishedAt },
        }),
      'Publicação agendada.',
    );
  }

  async function unpublishVideo(videoId: string) {
    await runPublicationAction(
      videoId,
      () => api<ApiPublicationResponse>(`/videos/${videoId}/unpublish`, { method: 'PATCH' }),
      'Vídeo despublicado.',
    );
  }

  function setFilter(nextFilter: VideoListFilter) {
    filter.value = nextFilter;
    page.value = 1;
  }

  function goToPage(nextPage: number) {
    page.value = Math.min(Math.max(1, nextPage), totalPages.value);
  }

  return {
    filter,
    page,
    limit,
    mergedRows,
    meta,
    totalPages,
    isLoading,
    error,
    refresh,
    isEmpty,
    subtitle,
    transcodeLoadingId: readonly(transcodeLoadingId),
    enqueueTranscode,
    publicationLoadingId: readonly(publicationLoadingId),
    publishVideo,
    scheduleVideo,
    unpublishVideo,
    setFilter,
    goToPage,
  };
}
