import { UnrecoverableError, type Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('processTranscodeJob', () => {
  const processor: TranscodeProcessor = {
    transcode: vi.fn(),
  };

  const videoRepo: VideoRepository = {
    updateStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(processor.transcode).mockReset().mockResolvedValue(undefined);
    vi.mocked(videoRepo.updateStatus).mockReset().mockResolvedValue(undefined);
  });

  it('valida payload e chama processor com dados parseados', async () => {
    const job = createJob(validPayload);

    await processTranscodeJob(job, { processor, videoRepo });

    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.PROCESSING);
    expect(processor.transcode).toHaveBeenCalledWith(validPayload);
  });

  it('rejeita payload inválido sem chamar processor', async () => {
    const job = createJob({ ...validPayload, videoId: 'not-a-uuid' });

    await expect(processTranscodeJob(job, { processor, videoRepo })).rejects.toBeInstanceOf(
      UnrecoverableError,
    );

    expect(processor.transcode).not.toHaveBeenCalled();
    expect(videoRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('re-lança erro do processor e marca error na última tentativa', async () => {
    const failure = new Error('FFmpeg falhou');
    vi.mocked(processor.transcode).mockRejectedValue(failure);

    const job = createJob(validPayload, { attemptsMade: 2, attempts: 3 });

    await expect(processTranscodeJob(job, { processor, videoRepo })).rejects.toThrow('FFmpeg falhou');

    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.PROCESSING);
    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.ERROR, {
      errorReason: 'FFmpeg falhou',
    });
  });

  it('re-lança erro do processor sem marcar error antes da última tentativa', async () => {
    const failure = new Error('FFmpeg falhou');
    vi.mocked(processor.transcode).mockRejectedValue(failure);

    const job = createJob(validPayload, { attemptsMade: 0, attempts: 3 });

    await expect(processTranscodeJob(job, { processor, videoRepo })).rejects.toThrow('FFmpeg falhou');

    expect(videoRepo.updateStatus).toHaveBeenCalledTimes(1);
    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.PROCESSING);
  });

  it('marca error com mensagem padrão quando falha não é Error', async () => {
    vi.mocked(processor.transcode).mockRejectedValue('falha opaca');

    const job = createJob(validPayload, { attemptsMade: 2, attempts: 3 });

    await expect(processTranscodeJob(job, { processor, videoRepo })).rejects.toBe('falha opaca');

    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.ERROR, {
      errorReason: 'Falha na transcodificação',
    });
  });

  it('marca error na primeira tentativa quando attempts não está definido', async () => {
    vi.mocked(processor.transcode).mockRejectedValue(new Error('falha imediata'));

    const job = {
      id: 'transcode:job',
      data: validPayload,
      attemptsMade: 0,
      opts: {},
    } as Job<typeof validPayload>;

    await expect(processTranscodeJob(job, { processor, videoRepo })).rejects.toThrow('falha imediata');

    expect(videoRepo.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.ERROR, {
      errorReason: 'falha imediata',
    });
  });
});
