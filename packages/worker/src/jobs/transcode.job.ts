import { UnrecoverableError, type Job } from 'bullmq';
import { z } from 'zod';

import { VIDEO_STATUS, type TranscodeJobPayload } from '@playplus/shared';

import { logger } from '../config/logger.ts';
import type { VideoRepository } from '../infra/database/video.repository.ts';
import { videoRepository } from '../infra/database/video.repository.ts';
import type { TranscodeProcessor } from '../processors/transcode.processor.ts';
import { noopTranscodeProcessor } from '../processors/transcode.processor.ts';

const transcodeJobPayloadSchema = z.object({
  videoId: z.uuid(),
  storageOriginalKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
});

interface ProcessTranscodeJobDeps {
  processor: TranscodeProcessor;
  videoRepo: VideoRepository;
}

const defaultDeps: ProcessTranscodeJobDeps = {
  processor: noopTranscodeProcessor,
  videoRepo: videoRepository,
};

function getMaxAttempts(job: Job<TranscodeJobPayload>): number {
  return job.opts.attempts ?? 1;
}

function isLastAttempt(job: Job<TranscodeJobPayload>): boolean {
  return job.attemptsMade + 1 >= getMaxAttempts(job);
}

export async function processTranscodeJob(
  job: Job<TranscodeJobPayload>,
  deps: ProcessTranscodeJobDeps = defaultDeps,
): Promise<void> {
  const parsed = transcodeJobPayloadSchema.safeParse(job.data);

  if (!parsed.success) {
    logger.error(
      { jobId: job.id, issues: parsed.error.issues },
      'Payload de transcode inválido',
    );
    throw new UnrecoverableError('Payload de transcode inválido');
  }

  const payload: TranscodeJobPayload = parsed.data;

  logger.info(
    {
      jobId: job.id,
      videoId: payload.videoId,
      attempt: job.attemptsMade + 1,
      maxAttempts: getMaxAttempts(job),
    },
    'Transcode job recebido',
  );

  await deps.videoRepo.updateStatus(payload.videoId, VIDEO_STATUS.PROCESSING);

  try {
    await deps.processor.transcode(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha na transcodificação';

    if (isLastAttempt(job)) {
      await deps.videoRepo.updateStatus(payload.videoId, VIDEO_STATUS.ERROR, {
        errorReason: message,
      });
      logger.error(
        { jobId: job.id, videoId: payload.videoId, err: error },
        'Transcode esgotou tentativas',
      );
    }

    throw error;
  }
}
