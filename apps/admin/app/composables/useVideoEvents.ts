import {
  VIDEO_STATUS,
  type VideoErrorEvent,
  type VideoStatus,
  type VideoStatusEvent,
} from '@playplus/shared';
import { onMounted, onUnmounted, readonly, ref, watch } from 'vue';

import { parseVideoEvent } from '~/utils/parse-video-event';
import type { VideoLivePatch } from '~/utils/videos';

export type VideoEventsConnectionState = 'connecting' | 'open' | 'closed';

const WS_CLOSE_NORMAL = 1000;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 5000;

export function applyVideoEventToPatches(
  patches: Record<string, VideoLivePatch>,
  event: VideoStatusEvent | VideoErrorEvent,
): Record<string, VideoLivePatch> {
  if (event.type === 'video.status') {
    const { video_id: videoId, status, progress } = event.payload;
    const existing = patches[videoId];

    return {
      ...patches,
      [videoId]: {
        status: status as VideoStatus,
        progress: progress ?? existing?.progress,
        errorReason: undefined,
      },
    };
  }

  return {
    ...patches,
    [event.payload.video_id]: {
      status: VIDEO_STATUS.ERROR,
      errorReason: event.payload.reason,
    },
  };
}

export function useVideoEvents() {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();

  const patches = ref<Record<string, VideoLivePatch>>({});
  const connectionState = ref<VideoEventsConnectionState>('closed');

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;
  let intentionalClose = false;

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

  function scheduleReconnect() {
    if (!import.meta.client || intentionalClose || !authStore.accessToken) {
      return;
    }

    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
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

    disconnect(false);
    intentionalClose = false;
    connectionState.value = 'connecting';

    const url = `${config.public.wsUrl}?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(url);

    socket.onopen = () => {
      connectionState.value = 'open';
      backoffMs = INITIAL_BACKOFF_MS;
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
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect(true);
  });

  watch(
    () => authStore.accessToken,
    (token, previousToken) => {
      if (!token) {
        disconnect(true);
        return;
      }

      if (token !== previousToken) {
        connect();
      }
    },
  );

  return {
    patches: readonly(patches),
    connectionState: readonly(connectionState),
  };
}
