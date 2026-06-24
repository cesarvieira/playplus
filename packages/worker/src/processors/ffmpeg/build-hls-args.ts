import path from 'node:path';

import { HLS_SEGMENT_SECONDS, type HlsRendition } from './constants.ts';

interface BuildHlsArgsInput {
  inputPath: string;
  outputDir: string;
  renditions: HlsRendition[];
}

export function buildHlsArgs({ inputPath, outputDir, renditions }: BuildHlsArgsInput): string[] {
  if (renditions.length === 0) {
    throw new Error('Pelo menos uma rendição é necessária para transcodificação HLS');
  }

  const filterParts: string[] = [];
  const splitLabels = renditions.map((_, index) => `[v${index}]`).join('');
  filterParts.push(`[0:v]split=${renditions.length}${splitLabels}`);

  renditions.forEach((rendition, index) => {
    filterParts.push(
      `[v${index}]scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease,pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2[vout${index}]`,
    );
  });

  const filterComplex = filterParts.join(';');

  const args: string[] = ['-y', '-i', inputPath, '-filter_complex', filterComplex];

  renditions.forEach((rendition, index) => {
    args.push(
      '-map',
      `[vout${index}]`,
      '-map',
      '0:a?',
      `-c:v:${index}`,
      'libx264',
      `-b:v:${index}`,
      rendition.videoBitrate,
      `-c:a:${index}`,
      'aac',
      `-b:a:${index}`,
      rendition.audioBitrate,
    );
  });

  const varStreamMap = renditions
    .map((rendition, index) => `v:${index},a:${index},name:${rendition.name}`)
    .join(' ');

  const masterPlaylist = path.join(outputDir, 'master.m3u8');

  args.push(
    '-f',
    'hls',
    '-hls_time',
    String(HLS_SEGMENT_SECONDS),
    '-hls_playlist_type',
    'vod',
    '-hls_flags',
    'independent_segments',
    '-master_pl_name',
    path.basename(masterPlaylist),
    '-var_stream_map',
    varStreamMap,
    '-hls_segment_filename',
    path.join(outputDir, '%v', 'segment_%03d.ts'),
    path.join(outputDir, '%v', 'index.m3u8'),
  );

  return args;
}

export function buildFfmpegCommandArgs(hlsArgs: string[]): string[] {
  return ['-hide_banner', '-loglevel', 'error', '-progress', 'pipe:1', '-nostats', ...hlsArgs];
}
