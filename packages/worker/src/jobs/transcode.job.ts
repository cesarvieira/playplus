import { UnrecoverableError, type Job } from 'bullmq';
import { z } from 'zod';

import {
  VIDEO_STATUS,
  assertValidStatusTransition,
  buildTranscodeJobId,
  type TranscodeJobPayload,
} from '@playplus/shared';

import { logger } from '../config/logger.ts';
import type { VideoRepository } from '../infra/database/video.repository.ts';
import { videoRepository } from '../infra/database/video.repository.ts';
import { createProgressThrottle } from '../infra/events/progress-throttle.ts';
import {
  createVideoEventPublisher,
  type VideoEventPublisher,
} from '../infra/events/video-events.ts';
import { FfmpegProcessError } from '../processors/ffmpeg/errors.ts';
import type { TranscodeProcessor, TranscodeResult } from '../processors/transcode.processor.ts';
import { createFfmpegTranscodeProcessor } from '../processors/transcode.processor.ts';

const transcodeJobPayloadSchema = z.object({
  videoId: z.uuid(),
  storageOriginalKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
});

interface ProcessTranscodeJobDeps {
  processor: TranscodeProcessor;
  videoRepo: VideoRepository;
  eventPublisher?: VideoEventPublisher;
}

const noopEventPublisher: VideoEventPublisher = {
  async publishVideoStatus() {
    void Promise.resolve();
  },
  async publishVideoError() {
    void Promise.resolve();
  },
};

const defaultDeps: ProcessTranscodeJobDeps = {
  processor: createFfmpegTranscodeProcessor(),
  videoRepo: videoRepository,
  eventPublisher: createVideoEventPublisher(),
};

function getMaxAttempts(job: Job<TranscodeJobPayload>): number {
  return job.opts.attempts ?? 1;
}

function isLastAttempt(job: Job<TranscodeJobPayload>): boolean {
  return job.attemptsMade + 1 >= getMaxAttempts(job);
}

function resolveJobId(job: Job<TranscodeJobPayload>): string {
  return job.id ?? buildTranscodeJobId(job.data.videoId);
}

function resolveVideoErrorReason(error: unknown): string {
  if (error instanceof FfmpegProcessError) {
    return error.reason;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'transcode_failed';
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
  const jobId = resolveJobId(job);
  const eventPublisher = deps.eventPublisher ?? noopEventPublisher;
  const shouldPublishProgress = deps.eventPublisher !== undefined;

  logger.info(
    {
      jobId,
      videoId: payload.videoId,
      attempt: job.attemptsMade + 1,
      maxAttempts: getMaxAttempts(job),
    },
    'Transcode job recebido',
  );

  if (job.attemptsMade === 0) {
    await deps.videoRepo.updateStatus(payload.videoId, VIDEO_STATUS.PROCESSING);
  }

  const progressThrottle = createProgressThrottle((progress) => {
    if (!shouldPublishProgress) {
      return;
    }

    void eventPublisher.publishVideoStatus({
      video_id: payload.videoId,
      job_id: jobId,
      status: VIDEO_STATUS.PROCESSING,
      progress,
    });
  });

  if (shouldPublishProgress) {
    await eventPublisher.publishVideoStatus({
      video_id: payload.videoId,
      job_id: jobId,
      status: VIDEO_STATUS.PROCESSING,
      progress: 0,
    });
  }

  try {
    const transcodeContext = shouldPublishProgress
      ? {
          jobId,
          onProgress: (progress: number) => {
            progressThrottle.report(progress);
          },
        }
      : { jobId };

    const result: TranscodeResult = await deps.processor.transcode(payload, transcodeContext);

    if (shouldPublishProgress) {
      progressThrottle.flush(100);
    }

    assertValidStatusTransition(VIDEO_STATUS.PROCESSING, VIDEO_STATUS.READY);

    await deps.videoRepo.updateStatus(payload.videoId, VIDEO_STATUS.READY, {
      duration: result.durationSeconds,
      storageHlsPrefix: result.storageHlsPrefix,
    });

    if (shouldPublishProgress) {
      await eventPublisher.publishVideoStatus({
        video_id: payload.videoId,
        job_id: jobId,
        status: VIDEO_STATUS.READY,
        progress: 100,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha na transcodificação';

    if (isLastAttempt(job)) {
      await deps.videoRepo.updateStatus(payload.videoId, VIDEO_STATUS.ERROR, {
        errorReason: message,
      });

      if (shouldPublishProgress) {
        await eventPublisher.publishVideoError({
          video_id: payload.videoId,
          job_id: jobId,
          reason: resolveVideoErrorReason(error),
        });
      }

      logger.error(
        { jobId, videoId: payload.videoId, err: error },
        'Transcode esgotou tentativas',
      );
    }

    throw error;
  }
}
