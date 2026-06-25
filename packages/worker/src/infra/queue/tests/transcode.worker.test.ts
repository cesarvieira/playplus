import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VIDEO_QUEUE_NAME, VIDEO_TRANSCODE_JOB_NAME, buildTranscodeJobId } from '@playplus/shared';

const processTranscodeJob = vi.fn();

vi.mock('../../../jobs/transcode.job.ts', () => ({
  processTranscodeJob,
}));

type WorkerHandler = (job: {
  id: string;
  name: string;
  data: { videoId: string };
  attemptsMade?: number;
}) => Promise<void>;

let workerHandler: WorkerHandler | undefined;
const eventHandlers = new Map<string, (job?: unknown, error?: unknown) => void>();

vi.mock('bullmq', () => ({
  Worker: class MockWorker {
    constructor(_queueName: string, handler: WorkerHandler) {
      workerHandler = handler;
    }

    on = vi.fn((event: string, handler: (job?: unknown, error?: unknown) => void) => {
      eventHandlers.set(event, handler);
    });

    close = vi.fn();
  },
}));

const videoId = '00000000-0000-4000-8000-000000000001';

describe('createTranscodeWorker', () => {
  beforeEach(() => {
    processTranscodeJob.mockReset().mockResolvedValue(undefined);
    workerHandler = undefined;
    eventHandlers.clear();
  });

  it('registra worker na fila video', async () => {
    const { createTranscodeWorker } = await import('../transcode.worker.ts');

    createTranscodeWorker({} as never);

    expect(workerHandler).toBeDefined();
    expect(VIDEO_QUEUE_NAME).toBe('video');
  });

  it('delega jobs video.transcode ao processTranscodeJob', async () => {
    const { createTranscodeWorker } = await import('../transcode.worker.ts');

    createTranscodeWorker({} as never);

    const job = {
      id: buildTranscodeJobId(videoId),
      name: VIDEO_TRANSCODE_JOB_NAME,
      data: { videoId },
    };

    expect(workerHandler).toBeDefined();
    await workerHandler?.(job);

    expect(processTranscodeJob).toHaveBeenCalledWith(job);
  });

  it('ignora jobs com nome desconhecido', async () => {
    const { createTranscodeWorker } = await import('../transcode.worker.ts');

    createTranscodeWorker({} as never);

    expect(workerHandler).toBeDefined();
    await workerHandler?.({
      id: 'other:1',
      name: 'video.thumbnail',
      data: { videoId },
    });

    expect(processTranscodeJob).not.toHaveBeenCalled();
  });

  it('registra handlers de completed e failed', async () => {
    const { createTranscodeWorker } = await import('../transcode.worker.ts');

    createTranscodeWorker({} as never);

    expect(eventHandlers.has('completed')).toBe(true);
    expect(eventHandlers.has('failed')).toBe(true);
  });

  it('handler completed registra log estruturado', async () => {
    const { createTranscodeWorker } = await import('../transcode.worker.ts');

    createTranscodeWorker({} as never);

    eventHandlers.get('completed')?.({
      id: buildTranscodeJobId(videoId),
      data: { videoId },
      attemptsMade: 1,
    });
  });

  it('handler failed registra log estruturado', async () => {
    const { createTranscodeWorker } = await import('../transcode.worker.ts');

    createTranscodeWorker({} as never);

    eventHandlers.get('failed')?.(
      {
        id: buildTranscodeJobId(videoId),
        data: { videoId },
        attemptsMade: 3,
      },
      new Error('falha'),
    );
  });

  it('closeTranscodeWorker encerra conexão do worker', async () => {
    const { createTranscodeWorker, closeTranscodeWorker } = await import('../transcode.worker.ts');
    const worker = createTranscodeWorker({} as never);

    await closeTranscodeWorker(worker);

    expect(worker.close).toHaveBeenCalled();
  });
});
