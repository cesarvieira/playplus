import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnrecoverableError, type Job } from 'bullmq';

import { VIDEO_STATUS } from '@playplus/shared';

import { processTranscodeJob } from '../transcode.job.ts';
import type { TranscodeProcessor } from '../../processors/transcode.processor.ts';
import type { VideoRepository } from '../../infra/database/video.repository.ts';
import type { VideoEventPublisher } from '../../infra/events/video-events.ts';

const videoId = '00000000-0000-4000-8000-000000000001';

const validPayload = {
  videoId,
  storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
  fileName: 'movie.mp4',
  fileSize: 1024,
};

const transcodeResult = {
  durationSeconds: 120,
  storageHlsPrefix: `videos/${videoId}/hls/`,
};

function createJob(
  data: unknown,
  options: { attemptsMade?: number; attempts?: number; id?: string } = {},
): Job<typeof validPayload> {
  return {
    id: options.id ?? 'transcode:job',
    data,
    attemptsMade: options.attemptsMade ?? 0,
    opts: { attempts: options.attempts ?? 3 },
  } as Job<typeof validPayload>;
}

describe('processTranscodeJob — pub/sub video.status', () => {
  const processor: TranscodeProcessor = {
    transcode: vi.fn(),
  };

  const videoRepo: VideoRepository = {
    updateStatus: vi.fn(),
    findStatusById: vi.fn().mockResolvedValue(VIDEO_STATUS.PENDING),
  };

  const eventPublisher: VideoEventPublisher = {
    publishVideoStatus: vi.fn(),
    publishVideoError: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(processor.transcode).mockReset().mockResolvedValue(transcodeResult);
    vi.mocked(videoRepo.updateStatus).mockReset().mockResolvedValue(undefined);
    vi.mocked(eventPublisher.publishVideoStatus).mockReset().mockResolvedValue(undefined);
  });

  it('publica processing progress 0 e repassa onProgress ao processor', async () => {
    const job = createJob(validPayload);

    await processTranscodeJob(job, { processor, videoRepo, eventPublisher });

    expect(eventPublisher.publishVideoStatus).toHaveBeenCalledWith({
      video_id: videoId,
      job_id: 'transcode:job',
      status: VIDEO_STATUS.PROCESSING,
      progress: 0,
    });
    expect(processor.transcode).toHaveBeenCalledWith(validPayload, {
      jobId: 'transcode:job',
      onProgress: expect.any(Function),
    });
  });

  it('rejeita payload inválido sem publicar eventos', async () => {
    const job = createJob({ ...validPayload, videoId: 'not-a-uuid' });

    await expect(
      processTranscodeJob(job, { processor, videoRepo, eventPublisher }),
    ).rejects.toBeInstanceOf(UnrecoverableError);

    expect(eventPublisher.publishVideoStatus).not.toHaveBeenCalled();
  });
});
