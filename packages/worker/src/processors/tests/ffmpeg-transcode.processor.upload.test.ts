import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

import { createFfmpegTranscodeProcessor } from '../transcode.processor.ts';
import { TRANSCODE_PROGRESS } from '../progress.ts';

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

describe('createFfmpegTranscodeProcessor — upload HLS', () => {
  const download = vi.fn();
  const upload = vi.fn();

  beforeEach(() => {
    download.mockReset().mockResolvedValue(undefined);
    upload.mockReset().mockResolvedValue(undefined);
    mkdtempMock.mockReset().mockResolvedValue('/tmp/playplus-transcode-workspace');
    rmMock.mockReset().mockResolvedValue(undefined);
    transcodeToHlsMock.mockReset().mockResolvedValue({
      outputDir: '/tmp/playplus-transcode-workspace/hls',
      masterPlaylistPath: '/tmp/playplus-transcode-workspace/hls/master.m3u8',
      durationSeconds: 30,
      renditions: ['240p', '480p'],
    });
  });

  it('baixa, transcodifica, faz upload HLS e retorna metadados', async () => {
    const onProgress = vi.fn();
    const processor = createFfmpegTranscodeProcessor({
      download,
      transcode: transcodeToHlsMock,
      upload,
      ffmpegPath: 'ffmpeg',
    });

    const result = await processor.transcode(payload, { jobId: 'transcode:job', onProgress });

    expect(download).toHaveBeenCalledWith(
      payload.storageOriginalKey,
      path.join('/tmp/playplus-transcode-workspace', 'movie.mp4'),
    );
    expect(transcodeToHlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inputPath: path.join('/tmp/playplus-transcode-workspace', 'movie.mp4'),
        outputDir: path.join('/tmp/playplus-transcode-workspace', 'hls'),
        onProgress: expect.any(Function),
        ffmpegPath: 'ffmpeg',
      }),
    );
    expect(upload).toHaveBeenCalledWith(
      path.join('/tmp/playplus-transcode-workspace', 'hls'),
      `videos/${payload.videoId}/hls/`,
    );
    expect(onProgress).toHaveBeenCalledWith(TRANSCODE_PROGRESS.DOWNLOAD);
    expect(onProgress).toHaveBeenCalledWith(TRANSCODE_PROGRESS.THUMBNAIL);
    expect(onProgress).toHaveBeenCalledWith(TRANSCODE_PROGRESS.UPLOAD);
    expect(result).toEqual({
      durationSeconds: 30,
      storageHlsPrefix: `videos/${payload.videoId}/hls/`,
    });
    expect(rmMock).toHaveBeenCalledWith('/tmp/playplus-transcode-workspace', {
      recursive: true,
      force: true,
    });
  });

  it('limpa workspace quando upload falha', async () => {
    upload.mockRejectedValue(new Error('upload falhou'));

    const processor = createFfmpegTranscodeProcessor({
      download,
      transcode: transcodeToHlsMock,
      upload,
      ffmpegPath: 'ffmpeg',
    });

    await expect(processor.transcode(payload, { jobId: 'transcode:job' })).rejects.toThrow(
      'upload falhou',
    );

    expect(rmMock).toHaveBeenCalled();
  });
});
