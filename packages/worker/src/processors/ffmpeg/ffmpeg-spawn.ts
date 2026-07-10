import { spawn } from 'node:child_process';

import { FfmpegProcessError } from './errors.ts';

interface SpawnFfmpegOptions {
  ffmpegPath?: string;
  durationMs: number;
  onProgress?: (percent: number) => void;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseProgressLine(
  line: string,
  durationMs: number,
  onProgress?: (percent: number) => void,
): void {
  if (!onProgress || durationMs <= 0) {
    return;
  }

  const match = /^out_time_ms=(\d+)$/.exec(line.trim());

  if (!match) {
    return;
  }

  const outTimeMs = Number.parseInt(match[1] ?? '0', 10);
  const percent = clampPercent((outTimeMs / durationMs) * 100);
  onProgress(percent);
}

export function spawnFfmpeg(args: string[], options: SpawnFfmpegOptions): Promise<void> {
  const ffmpegPath = options.ffmpegPath ?? 'ffmpeg';

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdout = child.stdout;
    const stderrStream = child.stderr;

    if (!stdout || !stderrStream) {
      reject(new Error('FFmpeg stdio não disponível para leitura de progresso'));
      return;
    }

    let stderr = '';
    let progressBuffer = '';

    stderrStream.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    stdout.on('data', (chunk: Buffer) => {
      progressBuffer += chunk.toString();

      const lines = progressBuffer.split('\n');
      progressBuffer = lines.pop() ?? '';

      for (const line of lines) {
        parseProgressLine(line, options.durationMs, options.onProgress);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (progressBuffer) {
        parseProgressLine(progressBuffer, options.durationMs, options.onProgress);
      }

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
