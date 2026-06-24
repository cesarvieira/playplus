import type { VideoStatus } from './video-status.ts';

export const VIDEO_EVENTS_CHANNEL = 'playplus:events:video' as const;

export interface VideoStatusEvent {
  type: 'video.status';
  payload: {
    video_id: string;
    job_id: string;
    status: VideoStatus;
    progress?: number;
  };
}
