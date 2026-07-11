import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import type { FastifyPluginAsync } from 'fastify';
import type { Redis } from 'ioredis';

import { env } from '#config/env';
import { valkey } from '#infra/valkey/client';
import { JwtService } from '#modules/user/infra/jwt.service';

import { ConnectionRegistry } from './connection-registry.ts';
import { startHeartbeat } from './heartbeat.ts';
import { authenticateWsToken } from './ws-auth.ts';
import {
  createVideoEventsSubscriber,
  type VideoEvent,
  type VideoEventsSubscriber,
} from './video-events.subscriber.ts';

const WS_CLOSE_UNAUTHORIZED = 1008;

export interface WsPluginOptions {
  jwtService?: JwtService;
  valkeyClient?: Redis;
  createSubscriber?: (onEvent: (event: VideoEvent) => void) => VideoEventsSubscriber;
}

const wsPlugin: FastifyPluginAsync<WsPluginOptions> = async (fastify, options = {}) => {
  await fastify.register(rateLimit, {
    global: false,
  });
  await fastify.register(websocket);

  const jwtService =
    options.jwtService ??
    new JwtService({
      secret: env.JWT_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    });

  const registry = new ConnectionRegistry();
  let subscriber: VideoEventsSubscriber | null = null;

  const broadcastEvent = (event: VideoEvent): void => {
    registry.broadcastToAdmins(JSON.stringify(event));
  };

  fastify.addHook('onReady', async () => {
    subscriber =
      options.createSubscriber?.(broadcastEvent) ??
      createVideoEventsSubscriber(
        (options.valkeyClient ?? valkey).duplicate(),
        broadcastEvent,
      );

    await subscriber.start();
  });

  fastify.addHook('onClose', async () => {
    if (subscriber !== null) {
      await subscriber.stop();
      subscriber = null;
    }

    registry.closeAll();
  });

  fastify.get(
    '/ws',
    {
      websocket: true,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    (socket, request) => {
      const query = request.query as { token?: string | string[] };
      const token = Array.isArray(query.token) ? query.token[0] : query.token;
      const auth = authenticateWsToken(token, jwtService);

      if (!auth.ok) {
        socket.close(WS_CLOSE_UNAUTHORIZED, 'UNAUTHORIZED');
        return;
      }

      registry.add(auth.userId, auth.role, socket);
      const heartbeat = startHeartbeat(socket);

      socket.on('close', () => {
        heartbeat.stop();
        registry.remove(socket);
      });
    },
  );
};

export default wsPlugin;
