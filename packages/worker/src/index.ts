import type { ConnectionOptions } from 'bullmq';

import { logger } from './config/logger.ts';
import { closeDatabase, pingDatabase } from './infra/database.ts';
import { closeValkey, getValkeyClient, pingValkey } from './infra/valkey.ts';
import { pingStorage } from './infra/storage.ts';
import { closeTranscodeWorker, createTranscodeWorker } from './workers/transcode.worker.ts';

async function main(): Promise<void> {
  logger.info('Verificando conexões com PostgreSQL, Valkey e MinIO...');
  await pingDatabase();
  await pingValkey();
  await pingStorage();
  logger.info('Conexões OK');

  const worker = createTranscodeWorker(getValkeyClient() as ConnectionOptions);

  logger.info('Worker BullMQ em execução (processor noop)');

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
