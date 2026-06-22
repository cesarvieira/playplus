import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTranscodeJobId, VIDEO_QUEUE_NAME, VIDEO_TRANSCODE_JOB_NAME } from '@playplus/shared';

const queueAdd = vi.fn();
const queueGetJob = vi.fn();
const queueClose = vi.fn();

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    add = queueAdd;
    getJob = queueGetJob;
    close = queueClose;
  },
}));

vi.mock('#infra/valkey/client', () => ({
  valkey: {},
}));

const videoId = '00000000-0000-4000-8000-000000000001';

describe('TranscodeQueue', () => {
  beforeEach(() => {
    queueAdd.mockReset();
    queueGetJob.mockReset();
    queueClose.mockReset();
  });

  it('enqueue adiciona job com nome e jobId corretos', async () => {
    const { TranscodeQueue } = await import('../transcode.queue.ts');
    const queue = new TranscodeQueue({} as never);

    await queue.enqueue({
      videoId,
      storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
      fileName: 'movie.mp4',
      fileSize: 1024,
    });

    expect(queueAdd).toHaveBeenCalledWith(
      VIDEO_TRANSCODE_JOB_NAME,
      {
        videoId,
        storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
        fileName: 'movie.mp4',
        fileSize: 1024,
      },
      { jobId: buildTranscodeJobId(videoId) },
    );
    expect(VIDEO_QUEUE_NAME).toBe('video');
  });

  it('isJobActive retorna true para waiting, active e delayed', async () => {
    const { TranscodeQueue } = await import('../transcode.queue.ts');
    const queue = new TranscodeQueue({} as never);

    for (const state of ['waiting', 'active', 'delayed'] as const) {
      queueGetJob.mockResolvedValue({
        getState: vi.fn().mockResolvedValue(state),
      });

      await expect(queue.isJobActive(videoId)).resolves.toBe(true);
    }
  });

  it('isJobActive retorna false quando job não existe', async () => {
    const { TranscodeQueue } = await import('../transcode.queue.ts');
    const queue = new TranscodeQueue({} as never);

    queueGetJob.mockResolvedValue(null);

    await expect(queue.isJobActive(videoId)).resolves.toBe(false);
  });

  it('isJobActive retorna false para completed ou failed', async () => {
    const { TranscodeQueue } = await import('../transcode.queue.ts');
    const queue = new TranscodeQueue({} as never);

    for (const state of ['completed', 'failed'] as const) {
      queueGetJob.mockResolvedValue({
        getState: vi.fn().mockResolvedValue(state),
      });

      await expect(queue.isJobActive(videoId)).resolves.toBe(false);
    }
  });

  it('removeFailedJob remove apenas jobs em estado failed', async () => {
    const { TranscodeQueue } = await import('../transcode.queue.ts');
    const queue = new TranscodeQueue({} as never);
    const remove = vi.fn();

    queueGetJob.mockResolvedValue({
      getState: vi.fn().mockResolvedValue('failed'),
      remove,
    });

    await queue.removeFailedJob(videoId);

    expect(remove).toHaveBeenCalled();
  });

  it('removeFailedJob ignora job inexistente ou não failed', async () => {
    const { TranscodeQueue } = await import('../transcode.queue.ts');
    const queue = new TranscodeQueue({} as never);
    const remove = vi.fn();

    queueGetJob.mockResolvedValue(null);
    await queue.removeFailedJob(videoId);
    expect(remove).not.toHaveBeenCalled();

    queueGetJob.mockResolvedValue({
      getState: vi.fn().mockResolvedValue('completed'),
      remove,
    });
    await queue.removeFailedJob(videoId);
    expect(remove).not.toHaveBeenCalled();
  });
});
