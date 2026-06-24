import type { WebSocket } from 'ws';

interface HeartbeatOptions {
  pingIntervalMs?: number;
  pongTimeoutMs?: number;
}

interface HeartbeatHandle {
  stop(): void;
}

const DEFAULT_PING_INTERVAL_MS = 30_000;
const DEFAULT_PONG_TIMEOUT_MS = 10_000;

export function startHeartbeat(socket: WebSocket, options: HeartbeatOptions = {}): HeartbeatHandle {
  const pingIntervalMs = options.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS;
  const pongTimeoutMs = options.pongTimeoutMs ?? DEFAULT_PONG_TIMEOUT_MS;

  let isAlive = true;
  let pongTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearPongTimeout = (): void => {
    if (pongTimeout !== null) {
      clearTimeout(pongTimeout);
      pongTimeout = null;
    }
  };

  socket.on('pong', () => {
    isAlive = true;
    clearPongTimeout();
  });

  const interval = setInterval(() => {
    if (!isAlive) {
      socket.terminate();
      return;
    }

    isAlive = false;
    socket.ping();
    clearPongTimeout();
    pongTimeout = setTimeout(() => {
      if (!isAlive) {
        socket.terminate();
      }
    }, pongTimeoutMs);
  }, pingIntervalMs);

  return {
    stop() {
      clearInterval(interval);
      clearPongTimeout();
    },
  };
}
