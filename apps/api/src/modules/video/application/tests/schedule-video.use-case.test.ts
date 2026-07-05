import { describe, expect, it, vi } from 'vitest';
import { ValidationError, VideoNotFoundError, VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { ScheduleVideoUseCase } from '#modules/video/application/schedule-video.use-case';

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

describe('ScheduleVideoUseCase', () => {
  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const videoRepository = { findById: vi.fn().mockResolvedValue(null) };
    const useCase = new ScheduleVideoUseCase(videoRepository as never);

    await expect(
      useCase.execute(videoId, new Date('2030-01-01T00:00:00Z')),
    ).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('lança ValidationError quando data não é futura', async () => {
    const videoRepository = {
      findById: vi.fn().mockResolvedValue(createVideo()),
    };
    const useCase = new ScheduleVideoUseCase(videoRepository as never);
    const now = new Date('2026-07-04T12:00:00.000Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    await expect(
      useCase.execute(videoId, new Date('2026-07-03T12:00:00.000Z')),
    ).rejects.toBeInstanceOf(ValidationError);

    vi.useRealTimers();
  });

  it('agenda publicação com data futura', async () => {
    const video = createVideo();
    const scheduledAt = new Date('2030-01-01T00:00:00.000Z');
    const now = new Date('2026-07-04T12:00:00.000Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

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
      publishedAt: scheduledAt,
      createdAt,
      updatedAt: now,
    });

    const videoRepository = {
      findById: vi.fn().mockResolvedValue(video),
      updatePublishedAt: vi.fn().mockResolvedValue(updatedVideo),
    };
    const useCase = new ScheduleVideoUseCase(videoRepository as never);

    const result = await useCase.execute(videoId, scheduledAt);

    expect(videoRepository.updatePublishedAt).toHaveBeenCalledWith(videoId, scheduledAt);
    expect(result).toEqual({
      id: videoId,
      publishedAt: scheduledAt.toISOString(),
    });

    vi.useRealTimers();
  });
});
