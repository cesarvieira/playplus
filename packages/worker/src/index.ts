import type { ConnectionOptions } from 'bullmq';

import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { flushSentry, initSentry } from './config/sentry.ts';
import { closeDatabase, pingDatabase } from './infra/database.ts';
import { closeValkey, getValkeyClient, pingValkey } from './infra/valkey.ts';
import { pingStorage } from './infra/storage.ts';
import {
  closeTranscodeWorker,
  createTranscodeWorker,
  getShutdownTimeoutMs,
} from './infra/queue/transcode.worker.ts';
import { pingFfmpeg } from './processors/ffmpeg/ping-ffmpeg.ts';

async function main(): Promise<void> {
  initSentry();

  logger.info('Verificando conexões com PostgreSQL, Valkey, MinIO e FFmpeg...');
  await pingDatabase();
  await pingValkey();
  await pingStorage();
  await pingFfmpeg(env.FFMPEG_PATH);
  logger.info('Conexões OK');

  const worker = createTranscodeWorker(getValkeyClient() as ConnectionOptions);

  logger.info('Worker BullMQ em execução');

  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info(`Encerrando worker (${signal})...`);

    const shutdownTimeout = setTimeout(() => {
      logger.warn('Timeout de shutdown atingido — encerrando processo');
      process.exit(1);
    }, getShutdownTimeoutMs());

    shutdownTimeout.unref();

    try {
      await closeTranscodeWorker(worker);
      await closeValkey();
      await closeDatabase();
      await flushSentry();
      clearTimeout(shutdownTimeout);
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Erro durante shutdown do worker');
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

try {
  await main();
} catch (error: unknown) {
  logger.error(error);
  process.exit(1);
}
