export const VIDEO_QUEUE_NAME = 'video' as const;

export const VIDEO_TRANSCODE_JOB_NAME = 'video.transcode' as const;

export const VIDEO_TRANSCODE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
} as const;

export function buildTranscodeJobId(videoId: string): string {
  return `transcode:${videoId}`;
}
