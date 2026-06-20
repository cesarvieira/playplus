import Fastify from 'fastify';
import cors from '@fastify/cors';

import { env } from './config/env.ts';
import {
  createListenTextResolver,
  createLoggerConfig,
  isDevelopmentLogger,
} from './config/logger.ts';
import { closeDatabase } from './infra/database/client.ts';
import { closeValkey } from './infra/valkey/client.ts';
import errorHandlerPlugin from './http/plugins/error-handler.ts';
import healthRoutes from './http/routes/health.routes.ts';

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

  await fastify.register(cors, {
    origin: env.NODE_ENV === 'development',
  });
  await fastify.register(errorHandlerPlugin);
  await fastify.register(healthRoutes);

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
      listenTextResolver: createListenTextResolver(env.API_PORT),
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
