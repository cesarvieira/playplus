import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

import { createFfmpegTranscodeProcessor } from '../transcode.processor.ts';

const mkdtempMock = vi.hoisted(() => vi.fn());
const rmMock = vi.hoisted(() => vi.fn());
const transcodeToHlsMock = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', () => ({
  mkdtemp: mkdtempMock,
  rm: rmMock,
}));

vi.mock('../ffmpeg/hls-transcoder.ts', () => ({
  transcodeToHls: transcodeToHlsMock,
}));

const payload = {
  videoId: '00000000-0000-4000-8000-000000000001',
  storageOriginalKey: 'videos/original/movie.mp4',
  fileName: 'movie.mp4',
  fileSize: 1024,
};

describe('createFfmpegTranscodeProcessor', () => {
  const download = vi.fn();

  beforeEach(() => {
    download.mockReset().mockResolvedValue(undefined);
    mkdtempMock.mockReset().mockResolvedValue('/tmp/playplus-transcode-workspace');
    rmMock.mockReset().mockResolvedValue(undefined);
    transcodeToHlsMock.mockReset().mockResolvedValue({
      outputDir: '/tmp/playplus-transcode-workspace/hls',
      masterPlaylistPath: '/tmp/playplus-transcode-workspace/hls/master.m3u8',
      durationSeconds: 30,
      renditions: ['240p', '480p'],
    });
  });

  it('baixa original, transcodifica e limpa workspace', async () => {
    const onProgress = vi.fn();
    const processor = createFfmpegTranscodeProcessor({
      download,
      transcode: transcodeToHlsMock,
      ffmpegPath: 'ffmpeg',
    });

    await processor.transcode(payload, { jobId: 'transcode:job', onProgress });

    expect(download).toHaveBeenCalledWith(
      payload.storageOriginalKey,
      path.join('/tmp/playplus-transcode-workspace', 'movie.mp4'),
    );
    expect(transcodeToHlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inputPath: path.join('/tmp/playplus-transcode-workspace', 'movie.mp4'),
        outputDir: path.join('/tmp/playplus-transcode-workspace', 'hls'),
        onProgress,
        ffmpegPath: 'ffmpeg',
      }),
    );
    expect(onProgress).toHaveBeenCalledWith(100);
    expect(rmMock).toHaveBeenCalledWith('/tmp/playplus-transcode-workspace', {
      recursive: true,
      force: true,
    });
  });

  it('limpa workspace mesmo quando transcode falha', async () => {
    transcodeToHlsMock.mockRejectedValue(new Error('FFmpeg falhou'));

    const processor = createFfmpegTranscodeProcessor({
      download,
      transcode: transcodeToHlsMock,
      ffmpegPath: 'ffmpeg',
    });

    await expect(processor.transcode(payload, { jobId: 'transcode:job' })).rejects.toThrow(
      'FFmpeg falhou',
    );

    expect(rmMock).toHaveBeenCalled();
  });
});
