export const TRANSCODE_PROGRESS = {
  DOWNLOAD: 5,
  ENCODE_START: 5,
  ENCODE_END: 75,
  THUMBNAIL: 80,
  UPLOAD: 95,
  FINALIZE: 99,
} as const;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function mapEncodeProgress(localPercent: number): number {
  const local = clampPercent(localPercent);
  const span = TRANSCODE_PROGRESS.ENCODE_END - TRANSCODE_PROGRESS.ENCODE_START;

  return clampPercent(TRANSCODE_PROGRESS.ENCODE_START + (local / 100) * span);
}
