import {
  VIDEO_STATUS,
  type VideoErrorEvent,
  type VideoRetryEvent,
  type VideoStatus,
  type VideoStatusEvent,
} from '@playplus/shared';
import { computed, readonly, ref, watch } from 'vue';

import { parseVideoEvent } from '~/utils/parse-video-event';
import { resolveVideoStatusWsUrl } from '~/utils/ws-url';
import type { VideoLivePatch } from '~/utils/videos';

export type VideoStatusWsConnectionState = 'connecting' | 'open' | 'closed';

const WS_CLOSE_NORMAL = 1000;
const INITIAL_BACKOFF_MS = 1000;
export const MAX_BACKOFF_MS = 30000;

export type VideoWsEvent = VideoStatusEvent | VideoErrorEvent | VideoRetryEvent;

export function applyVideoEventToPatches(
  patches: Record<string, VideoLivePatch>,
  event: VideoWsEvent,
  now = new Date().toISOString(),
): Record<string, VideoLivePatch> {
  if (event.type === 'video.status') {
    const { video_id: videoId, status, progress, reason } = event.payload;
    const existing = patches[videoId];

    if (status === VIDEO_STATUS.ERROR) {
      return {
        ...patches,
        [videoId]: {
          status: VIDEO_STATUS.ERROR,
          errorReason: reason,
          progress: undefined,
          retryAttempt: undefined,
          maxAttempts: undefined,
          lastActivityAt: now,
        },
      };
    }

    return {
      ...patches,
      [videoId]: {
        status: status as VideoStatus,
        progress: progress ?? existing?.progress,
        errorReason: undefined,
        retryAttempt: undefined,
        maxAttempts: undefined,
        lastActivityAt: now,
      },
    };
  }

  if (event.type === 'video.retry') {
    const { video_id: videoId, attempt, max_attempts: maxAttempts } = event.payload;
    const existing = patches[videoId];

    return {
      ...patches,
      [videoId]: {
        status: VIDEO_STATUS.PROCESSING,
        progress: existing?.progress,
        errorReason: undefined,
        retryAttempt: attempt,
        maxAttempts,
        lastActivityAt: now,
      },
    };
  }

  return {
    ...patches,
    [event.payload.video_id]: {
      status: VIDEO_STATUS.ERROR,
      errorReason: event.payload.reason,
      progress: undefined,
      retryAttempt: undefined,
      maxAttempts: undefined,
      lastActivityAt: now,
    },
  };
}

export function computeNextBackoffMs(currentMs: number, maxMs = MAX_BACKOFF_MS): number {
  return Math.min(currentMs * 2, maxMs);
}

export function shouldRefetchOnReconnectOpen(hasEverOpened: boolean): boolean {
  return hasEverOpened;
}

export function computeIsReconnecting(
  hasEverOpened: boolean,
  connectionState: VideoStatusWsConnectionState,
): boolean {
  return hasEverOpened && connectionState !== 'open';
}

let sharedInstance: ReturnType<typeof createVideoStatusWs> | null = null;

function createVideoStatusWs() {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();

  const patches = ref<Record<string, VideoLivePatch>>({});
  const connectionState = ref<VideoStatusWsConnectionState>('closed');
  const hasEverOpened = ref(false);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;
  let intentionalClose = false;

  const isReconnecting = computed(() =>
    computeIsReconnecting(hasEverOpened.value, connectionState.value),
  );

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function handleMessage(raw: string) {
    const event = parseVideoEvent(raw);
    if (!event) {
      return;
    }

    patches.value = applyVideoEventToPatches(patches.value, event);
  }

  async function attemptReconnect() {
    if (!import.meta.client || intentionalClose) {
      return;
    }

    const refreshed = await authStore.refresh();
    if (!refreshed) {
      return;
    }

    // Rotação de token dispara connect() no watch(accessToken).
    backoffMs = computeNextBackoffMs(backoffMs);
  }

  function scheduleReconnect() {
    if (!import.meta.client || intentionalClose || !authStore.accessToken) {
      return;
    }

    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void attemptReconnect();
    }, backoffMs);
  }

  function connect() {
    if (!import.meta.client) {
      return;
    }

    const token = authStore.accessToken;
    if (!token) {
      return;
    }

    clearReconnectTimer();

    if (socket) {
      intentionalClose = true;
      socket.close(WS_CLOSE_NORMAL);
      socket = null;
    }

    intentionalClose = false;
    connectionState.value = 'connecting';

    const wsBase = resolveVideoStatusWsUrl(config.public.apiUrl, config.public.wsUrl);
    const url = `${wsBase}?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(url);

    socket.onopen = () => {
      const wasReconnect = hasEverOpened.value;
      hasEverOpened.value = true;
      connectionState.value = 'open';
      backoffMs = INITIAL_BACKOFF_MS;

      if (shouldRefetchOnReconnectOpen(wasReconnect)) {
        void refreshNuxtData('videos-list');
        void refreshNuxtData('videos-stats');
      }
    };

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        handleMessage(event.data);
      }
    };

    socket.onclose = () => {
      connectionState.value = 'closed';
      socket = null;

      if (!intentionalClose) {
        scheduleReconnect();
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  }

  function disconnect(intentional = true) {
    intentionalClose = intentional;
    clearReconnectTimer();

    if (socket) {
      socket.close(WS_CLOSE_NORMAL);
      socket = null;
    }

    connectionState.value = 'closed';

    if (intentional) {
      hasEverOpened.value = false;
    }
  }

  watch(
    () => authStore.accessToken,
    (token, previousToken) => {
      if (!token) {
        disconnect(true);
        return;
      }

      if (previousToken && token !== previousToken) {
        connect();
      }
    },
  );

  return {
    patches: readonly(patches),
    connectionState: readonly(connectionState),
    isReconnecting,
    connect,
    disconnect,
  };
}

export function useVideoStatusWs() {
  if (!sharedInstance) {
    sharedInstance = createVideoStatusWs();
  }

  return sharedInstance;
}
