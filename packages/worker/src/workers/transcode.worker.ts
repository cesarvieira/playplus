import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

import {
  VIDEO_QUEUE_NAME,
  VIDEO_TRANSCODE_JOB_NAME,
  type TranscodeJobPayload,
} from '@playplus/shared';

import { logger } from '../config/logger.ts';

export function createTranscodeWorker(connection: ConnectionOptions): Worker<TranscodeJobPayload> {
  const worker = new Worker<TranscodeJobPayload>(
    VIDEO_QUEUE_NAME,
    async (job) => {
      if (job.name !== VIDEO_TRANSCODE_JOB_NAME) {
        logger.warn({ jobName: job.name }, 'Job desconhecido ignorado');
        return;
      }

      logger.info(
        { jobId: job.id, videoId: job.data.videoId },
        'Transcode job recebido (noop)',
      );
    },
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, err: error }, 'Job falhou');
  });

  return worker;
}

export async function closeTranscodeWorker(worker: Worker): Promise<void> {
  await worker.close();
}
