import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';

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

describe('processTranscodeJob — ready', () => {
  const processor: TranscodeProcessor = {
    transcode: vi.fn(),
  };

  const videoRepo: VideoRepository = {
    findStatusById: vi.fn(),
    updateStatus: vi.fn(),
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

  it('marca ready com duration e storageHlsPrefix após sucesso', async () => {
    const job = createJob(validPayload);

    await processTranscodeJob(job, { processor, videoRepo });

    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.PROCESSING);
    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.READY, {
      duration: 120,
      storageHlsPrefix: `videos/${videoId}/hls/`,
    });
  });

  it('publica video.status ready após persistir no banco', async () => {
    const job = createJob(validPayload);

    await processTranscodeJob(job, { processor, videoRepo, eventPublisher });

    expect(eventPublisher.publishVideoStatus).toHaveBeenCalledWith({
      video_id: videoId,
      job_id: 'transcode:job',
      status: VIDEO_STATUS.PROCESSING,
      progress: 0,
    });
    expect(eventPublisher.publishVideoStatus).toHaveBeenCalledWith({
      video_id: videoId,
      job_id: 'transcode:job',
      status: VIDEO_STATUS.READY,
      progress: 100,
    });
  });

  it('não marca processing novamente em retry', async () => {
    const job = createJob(validPayload, { attemptsMade: 1, attempts: 3 });

    await processTranscodeJob(job, { processor, videoRepo });

    expect(videoRepo.updateStatus).toHaveBeenCalledTimes(1);
    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.READY, {
      duration: 120,
      storageHlsPrefix: `videos/${videoId}/hls/`,
    });
  });
});
