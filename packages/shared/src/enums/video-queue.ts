export const VIDEO_QUEUE_NAME = 'video' as const;

export const VIDEO_TRANSCODE_JOB_NAME = 'video.transcode' as const;

export function buildTranscodeJobId(videoId: string): string {
  return `transcode:${videoId}`;
}
