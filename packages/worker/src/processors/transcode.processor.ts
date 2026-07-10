import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildStorageHlsPrefix,
  buildStorageThumbnailKey,
  type TranscodeJobPayload,
} from '@playplus/shared';

import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import { downloadObject, uploadFile, uploadHlsDirectory } from '../infra/storage.ts';
import { extractThumbnailFrame } from './ffmpeg/extract-thumbnail.ts';
import { transcodeToHls } from './ffmpeg/hls-transcoder.ts';
import { mapEncodeProgress, TRANSCODE_PROGRESS } from './progress.ts';

export interface TranscodeResult {
  durationSeconds: number;
  storageHlsPrefix: string;
  thumbnailKey?: string;
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

interface ExtractThumbnailParams {
  inputPath: string;
  outputPath: string;
  durationSeconds: number;
  ffmpegPath: string;
}

interface FfmpegTranscodeProcessorDeps {
  download: (key: string, destPath: string) => Promise<void>;
  transcode: typeof transcodeToHls;
  upload: (localDir: string, keyPrefix: string) => Promise<void>;
  extractThumbnail: (params: ExtractThumbnailParams) => Promise<void>;
  uploadThumbnail: (key: string, filePath: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  ffmpegPath: string;
}

async function defaultFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const defaultFfmpegDeps: FfmpegTranscodeProcessorDeps = {
  download: downloadObject,
  transcode: transcodeToHls,
  upload: uploadHlsDirectory,
  extractThumbnail: ({ inputPath, outputPath, durationSeconds, ffmpegPath }) =>
    extractThumbnailFrame({ inputPath, outputPath, durationSeconds, ffmpegPath }),
  uploadThumbnail: (key, filePath) => uploadFile(key, filePath, 'image/jpeg'),
  fileExists: defaultFileExists,
  ffmpegPath: env.FFMPEG_PATH,
};

export function createFfmpegTranscodeProcessor(
  overrides: Partial<FfmpegTranscodeProcessorDeps> = {},
): TranscodeProcessor {
  const deps: FfmpegTranscodeProcessorDeps = { ...defaultFfmpegDeps, ...overrides };
  return {
    async transcode(payload, context) {
      const workspaceDir = await mkdtemp(path.join(os.tmpdir(), `playplus-transcode-${payload.videoId}-`));
      const inputPath = path.join(workspaceDir, payload.fileName);
      const outputDir = path.join(workspaceDir, 'hls');
      const thumbnailPath = path.join(workspaceDir, 'thumbnail.jpg');
      const storageHlsPrefix = buildStorageHlsPrefix(payload.videoId);
      const storageThumbnailKey = buildStorageThumbnailKey(payload.videoId);
      let thumbnailReady = false;

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
        context?.onProgress?.(TRANSCODE_PROGRESS.DOWNLOAD);

        const result = await deps.transcode({
          inputPath,
          outputDir,
          ffmpegPath: deps.ffmpegPath,
          onProgress: context?.onProgress
            ? (localPercent) => {
                context.onProgress?.(mapEncodeProgress(localPercent));
              }
            : undefined,
        });

        try {
          await deps.extractThumbnail({
            inputPath,
            outputPath: thumbnailPath,
            durationSeconds: result.durationSeconds,
            ffmpegPath: deps.ffmpegPath,
          });
          thumbnailReady = await deps.fileExists(thumbnailPath);
        } catch (error: unknown) {
          logger.error(
            {
              videoId: payload.videoId,
              jobId: context?.jobId,
              err: error,
            },
            'Falha ao extrair thumbnail — best-effort',
          );
        }

        context?.onProgress?.(TRANSCODE_PROGRESS.THUMBNAIL);

        await deps.upload(outputDir, storageHlsPrefix);

        let thumbnailKey: string | undefined;

        if (thumbnailReady) {
          try {
            await deps.uploadThumbnail(storageThumbnailKey, thumbnailPath);
            thumbnailKey = storageThumbnailKey;
          } catch (error: unknown) {
            logger.error(
              {
                videoId: payload.videoId,
                jobId: context?.jobId,
                err: error,
              },
              'Falha ao enviar thumbnail ao storage — best-effort',
            );
          }
        }

        context?.onProgress?.(TRANSCODE_PROGRESS.UPLOAD);

        logger.info(
          {
            videoId: payload.videoId,
            jobId: context?.jobId,
            durationSeconds: result.durationSeconds,
            renditions: result.renditions,
            storageHlsPrefix,
            thumbnailKey: thumbnailKey ?? null,
          },
          'Transcodificação HLS concluída e artefatos enviados ao storage',
        );

        return {
          durationSeconds: result.durationSeconds,
          storageHlsPrefix,
          thumbnailKey,
        };
      } finally {
        await rm(workspaceDir, { recursive: true, force: true });
      }
    },
  };
}
