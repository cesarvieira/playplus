import { describe, expect, it, vi } from 'vitest';
import { VideoNotFoundError, VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { PublishVideoUseCase } from '#modules/video/application/publish-video.use-case';

const videoId = '00000000-0000-4000-8000-000000000001';
const createdAt = new Date('2025-01-01T00:00:00Z');

function createVideo() {
  return VideoEntity.fromPersistence({
    id: videoId,
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 2048,
    duration: 7240,
    status: VIDEO_STATUS.READY,
    uploadComplete: true,
    storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
    storageHlsPrefix: `videos/${videoId}/hls/`,
    thumbnailKey: null,
    errorReason: null,
    publishedAt: null,
    createdAt,
    updatedAt: createdAt,
  });
}

describe('PublishVideoUseCase', () => {
  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const videoRepository = { findById: vi.fn().mockResolvedValue(null) };
    const useCase = new PublishVideoUseCase(videoRepository as never);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('define publishedAt como now e retorna id e publishedAt', async () => {
    const video = createVideo();
    const publishedAt = new Date('2026-07-04T15:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(publishedAt);

    const updatedVideo = VideoEntity.fromPersistence({
      id: videoId,
      title: 'Meu filme',
      fileName: 'movie.mp4',
      fileSize: 2048,
      duration: 7240,
      status: VIDEO_STATUS.READY,
      uploadComplete: true,
      storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
      storageHlsPrefix: `videos/${videoId}/hls/`,
      thumbnailKey: null,
      errorReason: null,
      publishedAt,
      createdAt,
      updatedAt: publishedAt,
    });

    const videoRepository = {
      findById: vi.fn().mockResolvedValue(video),
      updatePublishedAt: vi.fn().mockResolvedValue(updatedVideo),
    };
    const useCase = new PublishVideoUseCase(videoRepository as never);

    const result = await useCase.execute(videoId);

    expect(videoRepository.updatePublishedAt).toHaveBeenCalledWith(videoId, publishedAt);
    expect(result).toEqual({
      id: videoId,
      publishedAt: publishedAt.toISOString(),
    });

    vi.useRealTimers();
  });
});
