import * as Sentry from '@sentry/node';

import { env } from './env.ts';

let initialized = false;

export function initSentry(): void {
  if (initialized || !env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0,
  });

  initialized = true;
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!initialized) {
    return;
  }

  await Sentry.flush(timeoutMs);
}

export function captureTranscodeFailure(params: {
  error: unknown;
  videoId?: string;
  jobId?: string;
  attemptsMade?: number;
}): void {
  if (!initialized) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('component', 'worker');
    scope.setTag('job', 'video.transcode');

    if (params.videoId) {
      scope.setExtra('videoId', params.videoId);
    }

    if (params.jobId) {
      scope.setExtra('jobId', params.jobId);
    }

    if (params.attemptsMade !== undefined) {
      scope.setExtra('attemptsMade', params.attemptsMade);
    }

    if (params.error instanceof Error) {
      Sentry.captureException(params.error);
      return;
    }

    Sentry.captureMessage(String(params.error), 'error');
  });
}

export function captureStalledJob(jobId: string): void {
  if (!initialized) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('component', 'worker');
    scope.setTag('job', 'video.transcode');
    scope.setExtra('jobId', jobId);
    Sentry.captureMessage('Job de transcode stalled', 'warning');
  });
}
