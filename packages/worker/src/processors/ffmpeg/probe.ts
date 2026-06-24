import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { resolveFfprobePath } from './paths.ts';

const execFileAsync = promisify(execFile);

interface VideoProbeResult {
  width: number;
  height: number;
  durationSeconds: number;
}

interface FfprobeStream {
  width?: number;
  height?: number;
  duration?: string;
}

interface FfprobeFormat {
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export async function probeVideo(
  inputPath: string,
  options: { ffmpegPath?: string; ffprobePath?: string } = {},
): Promise<VideoProbeResult> {
  const ffprobePath = options.ffprobePath ?? resolveFfprobePath(options.ffmpegPath ?? 'ffmpeg');

  const { stdout } = await execFileAsync(
    ffprobePath,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,duration',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      inputPath,
    ],
    { timeout: 30_000, maxBuffer: 1024 * 1024 },
  );

  const parsed = JSON.parse(stdout) as FfprobeOutput;
  const stream = parsed.streams?.[0];

  if (!stream?.width || !stream.height) {
    throw new Error('Não foi possível detectar dimensões do vídeo');
  }

  const durationRaw = stream.duration ?? parsed.format?.duration;
  const durationSeconds = durationRaw ? Number.parseFloat(durationRaw) : Number.NaN;

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Não foi possível detectar duração do vídeo');
  }

  return {
    width: stream.width,
    height: stream.height,
    durationSeconds,
  };
}
