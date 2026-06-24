import { describe, expect, it } from 'vitest';

import { HLS_RENDITIONS } from '../constants.ts';
import { buildFfmpegCommandArgs, buildHlsArgs } from '../build-hls-args.ts';

describe('buildHlsArgs', () => {
  it('monta args com segmentos de 4s e var_stream_map name:240p', () => {
    const renditions = HLS_RENDITIONS.slice(0, 2);
    const args = buildHlsArgs({
      inputPath: '/tmp/input.mp4',
      outputDir: '/tmp/hls',
      renditions,
    });

    expect(args).toContain('-hls_time');
    expect(args).toContain('4');
    expect(args).toContain('-var_stream_map');
    expect(args.join(' ')).toContain('name:240p');
    expect(args.join(' ')).toContain('name:480p');
    expect(args).toContain('-filter_complex');
  });

  it('lança quando não há rendições', () => {
    expect(() =>
      buildHlsArgs({
        inputPath: '/tmp/input.mp4',
        outputDir: '/tmp/hls',
        renditions: [],
      }),
    ).toThrow(/Pelo menos uma rendição/);
  });
});

describe('buildFfmpegCommandArgs', () => {
  it('inclui progress pipe e nostats', () => {
    const args = buildFfmpegCommandArgs(['-i', 'input.mp4']);

    expect(args).toContain('-progress');
    expect(args).toContain('pipe:1');
    expect(args).toContain('-nostats');
  });
});
