import { describe, expect, it, vi } from 'vitest';
import { VideoNotFoundError, VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { UnpublishVideoUseCase } from '#modules/video/application/unpublish-video.use-case';

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
    publishedAt: new Date('2025-01-01T00:00:00Z'),
    createdAt,
    updatedAt: createdAt,
  });
}

describe('UnpublishVideoUseCase', () => {
  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const videoRepository = { findById: vi.fn().mockResolvedValue(null) };
    const useCase = new UnpublishVideoUseCase(videoRepository as never);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('define publishedAt como null', async () => {
    const video = createVideo();
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
      publishedAt: null,
      createdAt,
      updatedAt: createdAt,
    });

    const videoRepository = {
      findById: vi.fn().mockResolvedValue(video),
      updatePublishedAt: vi.fn().mockResolvedValue(updatedVideo),
    };
    const useCase = new UnpublishVideoUseCase(videoRepository as never);

    const result = await useCase.execute(videoId);

    expect(videoRepository.updatePublishedAt).toHaveBeenCalledWith(videoId, null);
    expect(result).toEqual({ id: videoId, publishedAt: null });
  });
});
