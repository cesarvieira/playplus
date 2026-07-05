import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildStorageHlsPrefix, type TranscodeJobPayload } from '@playplus/shared';

import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import { downloadObject, uploadHlsDirectory } from '../infra/storage.ts';
import { transcodeToHls } from './ffmpeg/hls-transcoder.ts';

export interface TranscodeResult {
  durationSeconds: number;
  storageHlsPrefix: string;
}

interface TranscodeContext {
  jobId: string;
  onProgress?: (percent: number) => void;
}

export interface TranscodeProcessor {
  transcode(payload: TranscodeJobPayload, context?: TranscodeContext): Promise<TranscodeResult>;
}

export const noopTranscodeProcessor: TranscodeProcessor = {
  async transcode(payload) {
    logger.info(
      { videoId: payload.videoId, storageOriginalKey: payload.storageOriginalKey },
      'Transcode processor noop — FFmpeg pendente',
    );

    return {
      durationSeconds: 0,
      storageHlsPrefix: buildStorageHlsPrefix(payload.videoId),
    };
  },
};

interface FfmpegTranscodeProcessorDeps {
  download: (key: string, destPath: string) => Promise<void>;
  transcode: typeof transcodeToHls;
  upload: (localDir: string, keyPrefix: string) => Promise<void>;
  ffmpegPath: string;
}

const defaultFfmpegDeps: FfmpegTranscodeProcessorDeps = {
  download: downloadObject,
  transcode: transcodeToHls,
  upload: uploadHlsDirectory,
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
      const storageHlsPrefix = buildStorageHlsPrefix(payload.videoId);

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

        await deps.upload(outputDir, storageHlsPrefix);

        context?.onProgress?.(100);

        logger.info(
          {
            videoId: payload.videoId,
            jobId: context?.jobId,
            durationSeconds: result.durationSeconds,
            renditions: result.renditions,
            storageHlsPrefix,
          },
          'Transcodificação HLS concluída e artefatos enviados ao storage',
        );

        return {
          durationSeconds: result.durationSeconds,
          storageHlsPrefix,
        };
      } finally {
        await rm(workspaceDir, { recursive: true, force: true });
      }
    },
  };
}
