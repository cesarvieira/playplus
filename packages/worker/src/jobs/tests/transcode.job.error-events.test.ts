import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';

import { VIDEO_STATUS } from '@playplus/shared';

import { processTranscodeJob } from '../transcode.job.ts';
import type { TranscodeProcessor } from '../../processors/transcode.processor.ts';
import type { VideoRepository } from '../../infra/database/video.repository.ts';
import type { VideoEventPublisher } from '../../infra/events/video-events.ts';
import { FfmpegProcessError } from '../../processors/ffmpeg/errors.ts';

const videoId = '00000000-0000-4000-8000-000000000001';

const validPayload = {
  videoId,
  storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
  fileName: 'movie.mp4',
  fileSize: 1024,
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

describe('processTranscodeJob — pub/sub video.error', () => {
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
    publishVideoRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(processor.transcode).mockReset();
    vi.mocked(videoRepo.updateStatus).mockReset().mockResolvedValue(undefined);
    vi.mocked(eventPublisher.publishVideoStatus).mockReset().mockResolvedValue(undefined);
    vi.mocked(eventPublisher.publishVideoError).mockReset().mockResolvedValue(undefined);
    vi.mocked(eventPublisher.publishVideoRetry).mockReset().mockResolvedValue(undefined);
  });

  it('publica video.error na última tentativa com reason do FFmpeg', async () => {
    vi.mocked(processor.transcode).mockRejectedValue(new FfmpegProcessError(1));

    const job = createJob(validPayload, { attemptsMade: 2, attempts: 3 });

    await expect(
      processTranscodeJob(job, { processor, videoRepo, eventPublisher }),
    ).rejects.toBeInstanceOf(FfmpegProcessError);

    expect(eventPublisher.publishVideoError).toHaveBeenCalledWith({
      video_id: videoId,
      job_id: 'transcode:job',
      reason: 'ffmpeg_exit_code_1',
    });
  });

  it('não publica video.error em tentativa intermediária', async () => {
    vi.mocked(processor.transcode).mockRejectedValue(new FfmpegProcessError(1));

    const job = createJob(validPayload, { attemptsMade: 0, attempts: 3 });

    await expect(
      processTranscodeJob(job, { processor, videoRepo, eventPublisher }),
    ).rejects.toBeInstanceOf(FfmpegProcessError);

    expect(eventPublisher.publishVideoError).not.toHaveBeenCalled();
    expect(eventPublisher.publishVideoRetry).toHaveBeenCalledWith({
      video_id: videoId,
      job_id: 'transcode:job',
      attempt: 1,
      max_attempts: 3,
      reason: 'ffmpeg_exit_code_1',
    });
  });

  it('usa reason fallback para falha opaca na última tentativa', async () => {
    vi.mocked(processor.transcode).mockRejectedValue('falha opaca');

    const job = createJob(validPayload, { attemptsMade: 2, attempts: 3 });

    await expect(
      processTranscodeJob(job, { processor, videoRepo, eventPublisher }),
    ).rejects.toBe('falha opaca');

    expect(eventPublisher.publishVideoError).toHaveBeenCalledWith({
      video_id: videoId,
      job_id: 'transcode:job',
      reason: 'transcode_failed',
    });
  });
});
