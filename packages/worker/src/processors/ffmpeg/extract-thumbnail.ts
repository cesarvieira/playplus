import { spawn } from 'node:child_process';

import { FfmpegProcessError } from './errors.ts';

const INTRO_SKIP_MIN_SECONDS = 3;
const INTRO_SKIP_RATIO = 0.08;
const WINDOW_MAX_SECONDS = 45;
const WINDOW_RATIO = 0.25;
const THUMBNAIL_FILTER_FRAMES = 120;

export interface ThumbnailWindow {
  seekStartSeconds: number;
  windowSeconds: number;
  useFallback: boolean;
}

export function resolveThumbnailWindow(durationSeconds: number): ThumbnailWindow {
  if (durationSeconds <= 0) {
    return { seekStartSeconds: 0, windowSeconds: 0, useFallback: true };
  }

  if (durationSeconds < INTRO_SKIP_MIN_SECONDS) {
    return { seekStartSeconds: 0, windowSeconds: durationSeconds, useFallback: false };
  }

  const seekStartSeconds = Math.max(INTRO_SKIP_MIN_SECONDS, durationSeconds * INTRO_SKIP_RATIO);
  let windowSeconds = Math.min(WINDOW_MAX_SECONDS, durationSeconds * WINDOW_RATIO);

  if (seekStartSeconds + windowSeconds > durationSeconds) {
    windowSeconds = Math.max(1, durationSeconds - seekStartSeconds);
  }

  if (seekStartSeconds > durationSeconds * 0.3 || windowSeconds < 1) {
    return { seekStartSeconds: 0, windowSeconds: durationSeconds, useFallback: false };
  }

  if (seekStartSeconds >= durationSeconds) {
    return { seekStartSeconds: 0, windowSeconds: 0, useFallback: true };
  }

  return { seekStartSeconds, windowSeconds, useFallback: false };
}

function spawnFfmpegOnce(args: string[], ffmpegPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    const stderrStream = child.stderr;

    if (!stderrStream) {
      reject(new Error('FFmpeg stderr não disponível'));
      return;
    }

    let stderr = '';

    stderrStream.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const exitCode = code ?? 1;
      const error = new FfmpegProcessError(exitCode);

      if (stderr.trim()) {
        error.cause = new Error(stderr.trim());
      }

      reject(error);
    });
  });
}

function formatSeekSeconds(seconds: number): string {
  return seconds.toFixed(3);
}

export function buildWindowedThumbnailArgs(
  inputPath: string,
  outputPath: string,
  window: ThumbnailWindow,
): string[] {
  return [
    '-ss',
    formatSeekSeconds(window.seekStartSeconds),
    '-i',
    inputPath,
    '-t',
    formatSeekSeconds(window.windowSeconds),
    '-vf',
    `thumbnail=n=${THUMBNAIL_FILTER_FRAMES}`,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    '-y',
    outputPath,
  ];
}

export function buildFallbackThumbnailArgs(
  inputPath: string,
  outputPath: string,
  durationSeconds: number,
): string[] {
  const seekSeconds = Math.max(0, durationSeconds * 0.5);

  return [
    '-ss',
    formatSeekSeconds(seekSeconds),
    '-i',
    inputPath,
    '-vframes',
    '1',
    '-q:v',
    '2',
    '-y',
    outputPath,
  ];
}

export interface ExtractThumbnailOptions {
  inputPath: string;
  outputPath: string;
  durationSeconds: number;
  ffmpegPath?: string;
}

export async function extractThumbnailFrame(options: ExtractThumbnailOptions): Promise<void> {
  const ffmpegPath = options.ffmpegPath ?? 'ffmpeg';
  const window = resolveThumbnailWindow(options.durationSeconds);

  if (window.useFallback) {
    await spawnFfmpegOnce(
      buildFallbackThumbnailArgs(options.inputPath, options.outputPath, options.durationSeconds),
      ffmpegPath,
    );
    return;
  }

  await spawnFfmpegOnce(
    buildWindowedThumbnailArgs(options.inputPath, options.outputPath, window),
    ffmpegPath,
  );
}
