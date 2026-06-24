import {
  VIDEO_STATUS,
  type VideoErrorEvent,
  type VideoStatusEvent,
} from '@playplus/shared';

const VIDEO_STATUSES = new Set<string>(Object.values(VIDEO_STATUS));

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function parseVideoEvent(raw: string): VideoStatusEvent | VideoErrorEvent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  if (parsed.type === 'video.status') {
    if (!isRecord(parsed.payload)) {
      return null;
    }

    const payload = parsed.payload;
    const videoId = payload.video_id;
    const jobId = payload.job_id;
    const status = payload.status;
    const progress = payload.progress;

    if (!isNonEmptyString(videoId) || !isNonEmptyString(jobId)) {
      return null;
    }

    if (!isNonEmptyString(status) || !VIDEO_STATUSES.has(status)) {
      return null;
    }

    if (
      progress !== undefined &&
      (typeof progress !== 'number' || progress < 0 || progress > 100)
    ) {
      return null;
    }

    return {
      type: 'video.status',
      payload: {
        video_id: videoId,
        job_id: jobId,
        status: status as VideoStatusEvent['payload']['status'],
        ...(progress !== undefined ? { progress } : {}),
      },
    };
  }

  if (parsed.type === 'video.error') {
    if (!isRecord(parsed.payload)) {
      return null;
    }

    const payload = parsed.payload;
    const videoId = payload.video_id;
    const jobId = payload.job_id;
    const reason = payload.reason;

    if (!isNonEmptyString(videoId) || !isNonEmptyString(jobId) || !isNonEmptyString(reason)) {
      return null;
    }

    return {
      type: 'video.error',
      payload: { video_id: videoId, job_id: jobId, reason },
    };
  }

  return null;
}
