import type { ConnectionOptions } from 'bullmq';

import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { closeDatabase, pingDatabase } from './infra/database.ts';
import { closeValkey, getValkeyClient, pingValkey } from './infra/valkey.ts';
import { pingStorage } from './infra/storage.ts';
import { closeTranscodeWorker, createTranscodeWorker } from './infra/queue/transcode.worker.ts';
import { pingFfmpeg } from './processors/ffmpeg/ping-ffmpeg.ts';

async function main(): Promise<void> {
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

    await closeTranscodeWorker(worker);
    await closeValkey();
    await closeDatabase();

    process.exit(0);
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
