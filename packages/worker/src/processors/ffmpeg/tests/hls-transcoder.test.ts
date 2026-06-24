import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

import { transcodeToHls } from '../hls-transcoder.ts';

const probeVideoMock = vi.hoisted(() => vi.fn());
const spawnFfmpegMock = vi.hoisted(() => vi.fn());
const accessMock = vi.hoisted(() => vi.fn());

vi.mock('../probe.ts', () => ({
  probeVideo: probeVideoMock,
}));

vi.mock('../ffmpeg-spawn.ts', () => ({
  spawnFfmpeg: spawnFfmpegMock,
}));

vi.mock('node:fs/promises', () => ({
  access: accessMock,
}));

describe('transcodeToHls', () => {
  beforeEach(() => {
    probeVideoMock.mockReset();
    spawnFfmpegMock.mockReset();
    accessMock.mockReset().mockResolvedValue(undefined);
  });

  it('orquestra probe, spawn e valida artefatos', async () => {
    probeVideoMock.mockResolvedValue({
      width: 1280,
      height: 720,
      durationSeconds: 30,
    });
    spawnFfmpegMock.mockImplementation(async (_args, options) => {
      options.onProgress?.(42);
    });

    const onProgress = vi.fn();

    const result = await transcodeToHls({
      inputPath: '/tmp/input.mp4',
      outputDir: '/tmp/hls',
      onProgress,
    });

    expect(spawnFfmpegMock).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      outputDir: '/tmp/hls',
      masterPlaylistPath: path.join('/tmp/hls', 'master.m3u8'),
      durationSeconds: 30,
      renditions: ['240p', '480p', '720p'],
    });
    expect(accessMock).toHaveBeenCalled();
  });
});
