import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS, VideoNotFoundError } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';

import { GetVideoQuery, buildStreamUrl } from '#modules/video/application/get-video.query';

const videoId = '00000000-0000-4000-8000-000000000001';
const createdAt = new Date('2025-01-01T00:00:00Z');
const cdnBaseUrl = 'http://localhost:8080/media';

function createVideo(
  status: typeof VIDEO_STATUS.PENDING | typeof VIDEO_STATUS.PROCESSING | typeof VIDEO_STATUS.READY,
) {
  return VideoEntity.fromPersistence({
    id: videoId,
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 2048,
    duration: status === VIDEO_STATUS.READY ? 7240 : null,
    status,
    uploadComplete: status !== VIDEO_STATUS.PENDING,
    storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
    storageHlsPrefix: `videos/${videoId}/hls/`,
    errorReason: null,
    createdAt,
    updatedAt: createdAt,
  });
}

function createQuery() {
  const videoRepository = {
    findById: vi.fn(),
    setUploadComplete: vi.fn(),
  };
  const storageClient = {
    objectExists: vi.fn(),
  };
  const query = new GetVideoQuery(videoRepository as never, storageClient as never, cdnBaseUrl);

  return { query, videoRepository, storageClient };
}

describe('buildStreamUrl', () => {
  it('monta stream_url com CDN_BASE_URL e videoId', () => {
    expect(buildStreamUrl('http://localhost:8080/media', videoId)).toBe(
      `http://localhost:8080/media/videos/${videoId}/hls/master.m3u8`,
    );
  });

  it('remove barra final do CDN_BASE_URL', () => {
    expect(buildStreamUrl('http://localhost:8080/media/', videoId)).toBe(
      `http://localhost:8080/media/videos/${videoId}/hls/master.m3u8`,
    );
  });
});

describe('GetVideoQuery', () => {
  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(null);

    await expect(query.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('retorna stream_url quando status é ready', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(VIDEO_STATUS.READY));

    const result = await query.execute(videoId);

    expect(result).toEqual({
      id: videoId,
      title: 'Meu filme',
      duration: 7240,
      thumbnailUrl: null,
      streamUrl: `http://localhost:8080/media/videos/${videoId}/hls/master.m3u8`,
      status: VIDEO_STATUS.READY,
      progress: null,
      createdAt: createdAt.toISOString(),
    });
  });

  it('omite stream_url quando status é processing', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(VIDEO_STATUS.PROCESSING));

    const result = await query.execute(videoId);

    expect(result).toEqual({
      id: videoId,
      title: 'Meu filme',
      duration: null,
      thumbnailUrl: null,
      status: VIDEO_STATUS.PROCESSING,
      progress: null,
      createdAt: createdAt.toISOString(),
    });
    expect(result).not.toHaveProperty('streamUrl');
  });

  it('resolve uploadComplete em pending via lazy HEAD', async () => {
    const { query, videoRepository, storageClient } = createQuery();
    const pendingVideo = createVideo(VIDEO_STATUS.PENDING);

    videoRepository.findById.mockResolvedValue(pendingVideo);
    storageClient.objectExists.mockResolvedValue(false);

    const result = await query.execute(videoId);

    expect(result.uploadComplete).toBe(false);
    expect(videoRepository.setUploadComplete).not.toHaveBeenCalled();
  });
});
