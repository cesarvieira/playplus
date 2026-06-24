import path from 'node:path';

export function resolveFfprobePath(ffmpegPath: string): string {
  if (ffmpegPath === 'ffmpeg') {
    return 'ffprobe';
  }

  const directory = path.dirname(ffmpegPath);
  const extension = path.extname(ffmpegPath);
  const baseName = extension ? `ffprobe${extension}` : 'ffprobe';

  return path.join(directory, baseName);
}
