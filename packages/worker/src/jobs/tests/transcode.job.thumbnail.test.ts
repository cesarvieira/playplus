import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';

import { VIDEO_STATUS } from '@playplus/shared';

import { processTranscodeJob } from '../transcode.job.ts';
import type { TranscodeProcessor } from '../../processors/transcode.processor.ts';
import type { VideoRepository } from '../../infra/database/video.repository.ts';

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
  thumbnailKey: `videos/${videoId}/hls/thumbnail.jpg`,
};

function createJob(data: unknown): Job<typeof validPayload> {
  return {
    id: 'transcode:job',
    data,
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as Job<typeof validPayload>;
}

describe('processTranscodeJob — thumbnail', () => {
  const processor: TranscodeProcessor = {
    transcode: vi.fn(),
  };

  const videoRepo: VideoRepository = {
    findStatusById: vi.fn(),
    updateStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(processor.transcode).mockReset().mockResolvedValue(transcodeResult);
    vi.mocked(videoRepo.updateStatus).mockReset().mockResolvedValue(undefined);
  });

  it('repassa thumbnailKey ao marcar ready', async () => {
    const job = createJob(validPayload);

    await processTranscodeJob(job, { processor, videoRepo });

    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.READY, {
      duration: 120,
      storageHlsPrefix: `videos/${videoId}/hls/`,
      thumbnailKey: `videos/${videoId}/hls/thumbnail.jpg`,
    });
  });
});
