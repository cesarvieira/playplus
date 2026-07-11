import { describe, expect, it, vi } from 'vitest';
import { VideoNotFoundError, VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { DeleteVideoUseCase } from '#modules/video/application/delete-video.use-case';

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
    thumbnailKey: `videos/${videoId}/hls/thumbnail.jpg`,
    errorReason: null,
    publishedAt: new Date('2025-01-01T00:00:00Z'),
    createdAt,
    updatedAt: createdAt,
  });
}

describe('DeleteVideoUseCase', () => {
  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const videoRepository = { findById: vi.fn().mockResolvedValue(null) };
    const useCase = new DeleteVideoUseCase(
      videoRepository as never,
      { deleteByPrefix: vi.fn() } as never,
      { forceRemoveJob: vi.fn() } as never,
    );

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('remove job, storage e registro do vídeo', async () => {
    const video = createVideo();
    const forceRemoveJob = vi.fn().mockResolvedValue(undefined);
    const deleteByPrefix = vi.fn().mockResolvedValue(undefined);
    const deleteVideo = vi.fn().mockResolvedValue(true);

    const videoRepository = {
      findById: vi.fn().mockResolvedValue(video),
      delete: deleteVideo,
    };

    const useCase = new DeleteVideoUseCase(
      videoRepository as never,
      { deleteByPrefix } as never,
      { forceRemoveJob } as never,
    );

    await useCase.execute(videoId);

    expect(forceRemoveJob).toHaveBeenCalledWith(videoId);
    expect(deleteByPrefix).toHaveBeenCalledWith(`videos/${videoId}/`);
    expect(deleteVideo).toHaveBeenCalledWith(videoId);
  });

  it('lança VideoNotFoundError quando delete do repositório não remove linha', async () => {
    const video = createVideo();
    const videoRepository = {
      findById: vi.fn().mockResolvedValue(video),
      delete: vi.fn().mockResolvedValue(false),
    };

    const useCase = new DeleteVideoUseCase(
      videoRepository as never,
      { deleteByPrefix: vi.fn().mockResolvedValue(undefined) } as never,
      { forceRemoveJob: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });
});
