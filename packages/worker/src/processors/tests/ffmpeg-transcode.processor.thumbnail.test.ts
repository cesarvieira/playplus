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

describe('createFfmpegTranscodeProcessor — thumbnail', () => {
  const download = vi.fn();
  const upload = vi.fn();
  const extractThumbnail = vi.fn();
  const uploadThumbnail = vi.fn();
  const fileExists = vi.fn();

  beforeEach(() => {
    download.mockReset().mockResolvedValue(undefined);
    upload.mockReset().mockResolvedValue(undefined);
    extractThumbnail.mockReset().mockResolvedValue(undefined);
    uploadThumbnail.mockReset().mockResolvedValue(undefined);
    fileExists.mockReset().mockResolvedValue(true);
    mkdtempMock.mockReset().mockResolvedValue('/tmp/playplus-transcode-workspace');
    rmMock.mockReset().mockResolvedValue(undefined);
    transcodeToHlsMock.mockReset().mockResolvedValue({
      outputDir: '/tmp/playplus-transcode-workspace/hls',
      masterPlaylistPath: '/tmp/playplus-transcode-workspace/hls/master.m3u8',
      durationSeconds: 120,
      renditions: ['240p', '480p'],
    });
  });

  it('extrai, envia thumbnail e retorna thumbnailKey', async () => {
    const processor = createFfmpegTranscodeProcessor({
      download,
      transcode: transcodeToHlsMock,
      upload,
      extractThumbnail,
      uploadThumbnail,
      fileExists,
      ffmpegPath: 'ffmpeg',
    });

    const result = await processor.transcode(payload, { jobId: 'transcode:job' });

    expect(extractThumbnail).toHaveBeenCalledWith({
      inputPath: path.join('/tmp/playplus-transcode-workspace', 'movie.mp4'),
      outputPath: path.join('/tmp/playplus-transcode-workspace', 'thumbnail.jpg'),
      durationSeconds: 120,
      ffmpegPath: 'ffmpeg',
    });
    expect(uploadThumbnail).toHaveBeenCalledWith(
      `videos/${payload.videoId}/hls/thumbnail.jpg`,
      path.join('/tmp/playplus-transcode-workspace', 'thumbnail.jpg'),
    );
    expect(result).toEqual({
      durationSeconds: 120,
      storageHlsPrefix: `videos/${payload.videoId}/hls/`,
      thumbnailKey: `videos/${payload.videoId}/hls/thumbnail.jpg`,
    });
  });

  it('continua transcode quando extração de thumbnail falha', async () => {
    extractThumbnail.mockRejectedValue(new Error('FFmpeg thumbnail falhou'));

    const processor = createFfmpegTranscodeProcessor({
      download,
      transcode: transcodeToHlsMock,
      upload,
      extractThumbnail,
      uploadThumbnail,
      fileExists,
      ffmpegPath: 'ffmpeg',
    });

    const result = await processor.transcode(payload, { jobId: 'transcode:job' });

    expect(upload).toHaveBeenCalled();
    expect(uploadThumbnail).not.toHaveBeenCalled();
    expect(result.thumbnailKey).toBeUndefined();
  });

  it('continua transcode quando upload da thumbnail falha', async () => {
    uploadThumbnail.mockRejectedValue(new Error('upload thumbnail falhou'));

    const processor = createFfmpegTranscodeProcessor({
      download,
      transcode: transcodeToHlsMock,
      upload,
      extractThumbnail,
      uploadThumbnail,
      fileExists,
      ffmpegPath: 'ffmpeg',
    });

    const result = await processor.transcode(payload, { jobId: 'transcode:job' });

    expect(upload).toHaveBeenCalled();
    expect(result.thumbnailKey).toBeUndefined();
  });
});
