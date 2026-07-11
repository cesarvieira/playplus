import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { RateLimitedError } from '@playplus/shared';

import { env } from './config/env.ts';
import {
  createListenTextResolver,
  createLoggerConfig,
  isDevelopmentLogger,
} from './config/logger.ts';
import { resolveCorsOrigin } from './http/cors-origins.ts';
import { closeDatabase } from './infra/database/client.ts';
import { closeValkey, valkey } from './infra/valkey/client.ts';
import { closeTranscodeQueue } from './modules/video/infra/transcode.queue.ts';
import errorHandlerPlugin from './http/plugins/error-handler.ts';
import authCorsPlugin from './http/plugins/auth-cors.plugin.ts';
import videoReconcilePlugin from './http/plugins/video-reconcile.plugin.ts';
import wsPlugin from './infra/websocket/ws.plugin.ts';
import healthRoutes from './http/routes/health.routes.ts';
import authRoutes from './modules/user/http/auth.routes.ts';
import meRoutes from './modules/user/http/me.routes.ts';
import videosRoutes from './modules/video/http/videos.routes.ts';
import categoriesRoutes from './modules/video/http/categories.routes.ts';
import mediaVerifyRoutes from './modules/video/http/media-verify.routes.ts';

export async function buildServer() {
  const fastify = Fastify({
    logger: createLoggerConfig(),
    disableRequestLogging: isDevelopmentLogger(),
  });

  if (isDevelopmentLogger()) {
    fastify.addHook('onResponse', (request, reply, done) => {
      fastify.log.info(
        `${request.method} ${request.url} ${reply.statusCode} ${Math.round(reply.elapsedTime)}ms`,
      );
      done();
    });
  }

  // Rate limit global por padrão (opt-out, não opt-in): toda rota nova já
  // nasce protegida contra flood, sem depender de alguém lembrar de
  // configurar. Rotas específicas ajustam o limite via `config.rateLimit`
  // (ver auth.routes, me.routes, videos.routes, categories.routes,
  // media-verify.routes — ADR-007 — e ws.plugin). Store no Valkey: em
  // memória local o contador é por processo, então com mais de uma réplica
  // da API o limite efetivo vira max × nº de réplicas; no Valkey o contador
  // é compartilhado e o limite vale de verdade.
  //
  // errorResponseBuilder: por padrão o @fastify/rate-limit dá `throw` num
  // Error puro (sem `.code`) quando o limite estoura. O errorHandlerPlugin
  // deste projeto só reconhece erros com `.code` de ERROR_CODE — sem isso,
  // um 429 vira 500 "Erro interno do servidor" e polui o log de erro com
  // algo que é, na verdade, o rate limit funcionando como esperado.
  // Devolvendo um RateLimitedError aqui, o error handler já sabe mapear
  // pra 429 com o corpo de erro padrão da API.
  await fastify.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    redis: valkey,
    keyGenerator: request => `ip:${request.ip}`,
    errorResponseBuilder: () => new RateLimitedError(),
  });
  await authCorsPlugin(fastify);
  await fastify.register(cors, {
    origin: resolveCorsOrigin,
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await fastify.register(cookie);
  await errorHandlerPlugin(fastify);
  await fastify.register(wsPlugin, { prefix: '/v1' });
  await fastify.register(videoReconcilePlugin);
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/v1' });
  await fastify.register(meRoutes, { prefix: '/v1' });
  await fastify.register(videosRoutes, { prefix: '/v1' });
  await fastify.register(categoriesRoutes, { prefix: '/v1' });
  await fastify.register(mediaVerifyRoutes, { prefix: '/v1' });

  return fastify;
}

async function start(): Promise<void> {
  const server = await buildServer();
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    server.log.info(`Encerrando servidor (${signal})...`);

    try {
      await server.close();
      await closeTranscodeQueue();
      await closeDatabase();
      await closeValkey();
      process.exit(0);
    } catch (error) {
      server.log.error(error);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  try {
    await server.listen({
      port: env.API_PORT,
      host: env.API_HOST,
      listenTextResolver: createListenTextResolver(env.API_PORT, { secure: false }),
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isMainModule) {
  void start();
}
