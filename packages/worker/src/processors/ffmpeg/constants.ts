export const HLS_SEGMENT_SECONDS = 4;

export interface HlsRendition {
  name: string;
  height: number;
  width: number;
  videoBitrate: string;
  audioBitrate: string;
}

export const HLS_RENDITIONS: readonly HlsRendition[] = [
  { name: '240p', height: 240, width: 426, videoBitrate: '400k', audioBitrate: '96k' },
  { name: '480p', height: 480, width: 854, videoBitrate: '1000k', audioBitrate: '128k' },
  { name: '720p', height: 720, width: 1280, videoBitrate: '2500k', audioBitrate: '128k' },
  { name: '1080p', height: 1080, width: 1920, videoBitrate: '5000k', audioBitrate: '192k' },
] as const;
