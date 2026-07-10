import type { VideoStatus } from './video-status.ts';

export const VIDEO_EVENTS_CHANNEL = 'playplus:events:video' as const;

export interface VideoStatusEvent {
  type: 'video.status';
  payload: {
    video_id: string;
    job_id: string;
    status: VideoStatus;
    progress?: number;
    reason?: string;
  };
}

export interface VideoErrorEvent {
  type: 'video.error';
  payload: {
    video_id: string;
    job_id: string;
    reason: string;
  };
}

export interface VideoRetryEvent {
  type: 'video.retry';
  payload: {
    video_id: string;
    job_id: string;
    attempt: number;
    max_attempts: number;
    reason: string;
  };
}

export type VideoEvent = VideoStatusEvent | VideoErrorEvent | VideoRetryEvent;
