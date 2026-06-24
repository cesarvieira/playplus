import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { TranscodeJobPayload } from '@playplus/shared';

import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import { downloadObject } from '../infra/storage.ts';
import { transcodeToHls } from './ffmpeg/hls-transcoder.ts';

export interface TranscodeContext {
  jobId: string;
  onProgress?: (percent: number) => void;
}

export interface TranscodeProcessor {
  transcode(payload: TranscodeJobPayload, context?: TranscodeContext): Promise<void>;
}

export const noopTranscodeProcessor: TranscodeProcessor = {
  async transcode(payload) {
    logger.info(
      { videoId: payload.videoId, storageOriginalKey: payload.storageOriginalKey },
      'Transcode processor noop — FFmpeg pendente',
    );
  },
};

interface FfmpegTranscodeProcessorDeps {
  download: (key: string, destPath: string) => Promise<void>;
  transcode: typeof transcodeToHls;
  ffmpegPath: string;
}

const defaultFfmpegDeps: FfmpegTranscodeProcessorDeps = {
  download: downloadObject,
  transcode: transcodeToHls,
  ffmpegPath: env.FFMPEG_PATH,
};

export function createFfmpegTranscodeProcessor(
  deps: FfmpegTranscodeProcessorDeps = defaultFfmpegDeps,
): TranscodeProcessor {
  return {
    async transcode(payload, context) {
      const workspaceDir = await mkdtemp(path.join(os.tmpdir(), `playplus-transcode-${payload.videoId}-`));
      const inputPath = path.join(workspaceDir, payload.fileName);
      const outputDir = path.join(workspaceDir, 'hls');

      try {
        logger.info(
          {
            videoId: payload.videoId,
            jobId: context?.jobId,
            storageOriginalKey: payload.storageOriginalKey,
          },
          'Iniciando transcodificação HLS',
        );

        await deps.download(payload.storageOriginalKey, inputPath);

        const result = await deps.transcode({
          inputPath,
          outputDir,
          ffmpegPath: deps.ffmpegPath,
          onProgress: context?.onProgress,
        });

        context?.onProgress?.(100);

        logger.info(
          {
            videoId: payload.videoId,
            jobId: context?.jobId,
            durationSeconds: result.durationSeconds,
            renditions: result.renditions,
          },
          'Transcodificação HLS concluída (upload pendente)',
        );
      } finally {
        await rm(workspaceDir, { recursive: true, force: true });
      }
    },
  };
}
