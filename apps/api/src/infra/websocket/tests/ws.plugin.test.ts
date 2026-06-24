import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { USER_ROLE, VIDEO_STATUS } from '@playplus/shared';

import { JwtService } from '#modules/user/infra/jwt.service';

import wsPlugin, { type WsPluginOptions } from '../ws.plugin.ts';
import type { VideoEvent } from '../video-events.subscriber.ts';

const JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

function getListenPort(app: ReturnType<typeof Fastify>): number {
  const address = app.server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Servidor WebSocket não está escutando');
  }

  return address.port;
}

function connectWebSocket(port: number, query = ''): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/v1/ws${query}`);

    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function waitForClose(ws: WebSocket) {
  return new Promise<{ code: number; reason: string }>((resolve) => {
    ws.on('close', (code, reason) => {
      resolve({ code, reason: reason.toString() });
    });
  });
}

function waitForMessage(ws: WebSocket) {
  return new Promise<string>((resolve) => {
    ws.on('message', (data) => {
      resolve(data.toString());
    });
  });
}

describe('wsPlugin', () => {
  let app: ReturnType<typeof Fastify>;
  let jwtService: JwtService;
  let publishEvent: ((event: VideoEvent) => void) | null = null;
  let port = 0;

  const mockSubscriber = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jwtService = new JwtService({ secret: JWT_SECRET, accessTtlSeconds: 900 });
    publishEvent = null;
    mockSubscriber.start.mockClear();
    mockSubscriber.stop.mockClear();

    app = Fastify({ logger: false });

    const pluginOptions: WsPluginOptions = {
      jwtService,
      createSubscriber: (onEvent) => {
        publishEvent = onEvent;
        return mockSubscriber;
      },
    };

    await app.register(wsPlugin, { prefix: '/v1', ...pluginOptions });
    await app.listen({ port: 0, host: '127.0.0.1' });
    port = getListenPort(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('fecha com 1008 sem token', async () => {
    const ws = await connectWebSocket(port);
    const close = await waitForClose(ws);

    expect(close.code).toBe(1008);
    expect(close.reason).toBe('UNAUTHORIZED');
  });

  it('fecha com 1008 com token inválido', async () => {
    const ws = await connectWebSocket(port, '?token=invalid-token');
    const close = await waitForClose(ws);

    expect(close.code).toBe(1008);
    expect(close.reason).toBe('UNAUTHORIZED');
  });

  it('aceita conexão admin e entrega evento do pub/sub', async () => {
    const token = jwtService.sign({ sub: 'admin-id', role: USER_ROLE.ADMIN });
    const ws = await connectWebSocket(port, `?token=${token}`);
    const messagePromise = waitForMessage(ws);

    const event = {
      type: 'video.status' as const,
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: VIDEO_STATUS.PROCESSING,
        progress: 47,
      },
    };

    publishEvent?.(event);

    await expect(messagePromise).resolves.toBe(JSON.stringify(event));
    ws.terminate();
  });

  it('aceita viewer mas não entrega eventos de transcode', async () => {
    const token = jwtService.sign({ sub: 'viewer-id', role: USER_ROLE.VIEWER });
    const ws = await connectWebSocket(port, `?token=${token}`);

    let received = false;
    ws.on('message', () => {
      received = true;
    });

    publishEvent?.({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: VIDEO_STATUS.PROCESSING,
      },
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(received).toBe(false);
    ws.terminate();
  });

  it('inicia e encerra subscriber no ciclo de vida do servidor', async () => {
    expect(mockSubscriber.start).toHaveBeenCalled();

    await app.close();

    expect(mockSubscriber.stop).toHaveBeenCalled();
  });
});
