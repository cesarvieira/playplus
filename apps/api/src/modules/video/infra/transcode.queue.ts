import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

import {
  buildTranscodeJobId,
  VIDEO_QUEUE_NAME,
  VIDEO_TRANSCODE_JOB_NAME,
  type TranscodeJobPayload,
} from '@playplus/shared';

import { env } from '#config/env';
import { logServiceConnectionError } from '#infra/connection-error';
import { valkey } from '#infra/valkey/client';

const ACTIVE_JOB_STATES = new Set(['waiting', 'active', 'delayed']);
const VALKEY_SERVICE_NAME = 'Valkey';

type TranscodeQueueClient = Queue<TranscodeJobPayload, unknown, typeof VIDEO_TRANSCODE_JOB_NAME>;

export class TranscodeQueue {
  private readonly queue: TranscodeQueueClient;

  constructor(connection: ConnectionOptions = valkey as ConnectionOptions) {
    this.queue = new Queue<TranscodeJobPayload, unknown, typeof VIDEO_TRANSCODE_JOB_NAME>(
      VIDEO_QUEUE_NAME,
      { connection },
    );

    this.queue.on('error', (error) => {
      logServiceConnectionError(error, VALKEY_SERVICE_NAME, env.VALKEY_URL);
    });
  }

  async enqueue(payload: TranscodeJobPayload): Promise<void> {
    await this.queue.add(VIDEO_TRANSCODE_JOB_NAME, payload, {
      jobId: buildTranscodeJobId(payload.videoId),
    });
  }

  async isJobActive(videoId: string): Promise<boolean> {
    const job = await this.queue.getJob(buildTranscodeJobId(videoId));

    if (!job) {
      return false;
    }

    const state = await job.getState();

    return ACTIVE_JOB_STATES.has(state);
  }

  async removeFailedJob(videoId: string): Promise<void> {
    const job = await this.queue.getJob(buildTranscodeJobId(videoId));

    if (!job) {
      return;
    }

    const state = await job.getState();

    if (state === 'failed') {
      await job.remove();
    }
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

let transcodeQueueInstance: TranscodeQueue | null = null;

export function createTranscodeQueue(): TranscodeQueue {
  if (!transcodeQueueInstance) {
    transcodeQueueInstance = new TranscodeQueue();
  }

  return transcodeQueueInstance;
}

export async function closeTranscodeQueue(): Promise<void> {
  if (!transcodeQueueInstance) {
    return;
  }

  await transcodeQueueInstance.close();
  transcodeQueueInstance = null;
}
