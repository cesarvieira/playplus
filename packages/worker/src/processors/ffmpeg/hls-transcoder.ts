import { access } from 'node:fs/promises';
import path from 'node:path';

import { buildFfmpegCommandArgs, buildHlsArgs } from './build-hls-args.ts';
import { spawnFfmpeg } from './ffmpeg-spawn.ts';
import { probeVideo } from './probe.ts';
import { resolveFfprobePath } from './paths.ts';
import { selectRenditions } from './renditions.ts';

interface HlsTranscodeResult {
  outputDir: string;
  masterPlaylistPath: string;
  durationSeconds: number;
  renditions: string[];
}

interface TranscodeToHlsOptions {
  inputPath: string;
  outputDir: string;
  onProgress?: (percent: number) => void;
  ffmpegPath?: string;
  ffprobePath?: string;
}

async function assertFileExists(filePath: string): Promise<void> {
  await access(filePath);
}

export async function transcodeToHls(options: TranscodeToHlsOptions): Promise<HlsTranscodeResult> {
  const ffmpegPath = options.ffmpegPath ?? 'ffmpeg';
  const ffprobePath = options.ffprobePath ?? resolveFfprobePath(ffmpegPath);

  const metadata = await probeVideo(options.inputPath, { ffmpegPath, ffprobePath });
  const renditions = selectRenditions(metadata.height);

  if (renditions.length === 0) {
    throw new Error('Nenhuma rendição compatível com a resolução do vídeo fonte');
  }

  const hlsArgs = buildHlsArgs({
    inputPath: options.inputPath,
    outputDir: options.outputDir,
    renditions,
  });

  const ffmpegArgs = buildFfmpegCommandArgs(hlsArgs);
  const durationMs = Math.round(metadata.durationSeconds * 1000);

  await spawnFfmpeg(ffmpegArgs, {
    ffmpegPath,
    durationMs,
    onProgress: options.onProgress,
  });

  const masterPlaylistPath = path.join(options.outputDir, 'master.m3u8');
  await assertFileExists(masterPlaylistPath);

  for (const rendition of renditions) {
    await assertFileExists(path.join(options.outputDir, rendition.name, 'index.m3u8'));
  }

  return {
    outputDir: options.outputDir,
    masterPlaylistPath,
    durationSeconds: Math.round(metadata.durationSeconds),
    renditions: renditions.map(rendition => rendition.name),
  };
}
