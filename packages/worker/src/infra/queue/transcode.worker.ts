import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

import {
  VIDEO_QUEUE_NAME,
  VIDEO_TRANSCODE_JOB_NAME,
  VIDEO_TRANSCODE_JOB_OPTIONS,
  type TranscodeJobPayload,
} from '@playplus/shared';

import { logger } from '../../config/logger.ts';
import { captureStalledJob, captureTranscodeFailure } from '../../config/sentry.ts';
import { processTranscodeJob } from '../../jobs/transcode.job.ts';

const SHUTDOWN_TIMEOUT_MS = 25 * 60 * 1000;

export function createTranscodeWorker(connection: ConnectionOptions): Worker<TranscodeJobPayload> {
  const worker = new Worker<TranscodeJobPayload>(
    VIDEO_QUEUE_NAME,
    async (job) => {
      if (job.name !== VIDEO_TRANSCODE_JOB_NAME) {
        logger.warn({ jobName: job.name }, 'Job desconhecido ignorado');
        return;
      }

      await processTranscodeJob(job);
    },
    {
      connection,
      concurrency: 1,
      // FFmpeg + upload HLS can exceed BullMQ default lock (30s).
      lockDuration: 30 * 60 * 1000,
      stalledInterval: 60_000,
      maxStalledCount: 2,
    },
  );

  worker.on('completed', (job) => {
    logger.info(
      {
        jobId: job.id,
        videoId: job.data.videoId,
        attemptsMade: job.attemptsMade,
      },
      'Job concluído',
    );
  });

  worker.on('failed', (job, error) => {
    const maxAttempts = job?.opts?.attempts ?? VIDEO_TRANSCODE_JOB_OPTIONS.attempts;
    const attemptsMade = job?.attemptsMade ?? 0;

    logger.error(
      {
        jobId: job?.id,
        videoId: job?.data.videoId,
        attemptsMade,
        err: error,
      },
      'Job falhou',
    );

    if (job && attemptsMade >= maxAttempts) {
      captureTranscodeFailure({
        error,
        videoId: job.data.videoId,
        jobId: job.id,
        attemptsMade,
      });
    }
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Job stalled — BullMQ tentará recuperar');
    captureStalledJob(jobId);
  });

  return worker;
}

export async function closeTranscodeWorker(worker: Worker): Promise<void> {
  // worker.close() aguarda o job ativo antes de encerrar (comportamento BullMQ).
  await worker.close();
}

export function getShutdownTimeoutMs(): number {
  return SHUTDOWN_TIMEOUT_MS;
}
