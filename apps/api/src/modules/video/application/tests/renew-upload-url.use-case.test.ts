import { describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, VIDEO_STATUS, VideoNotFoundError } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { InvalidVideoStatusError } from '#modules/video/domain/invalid-video-status.error';

import { RenewUploadUrlUseCase } from '#modules/video/application/renew-upload-url.use-case';

const videoId = '00000000-0000-4000-8000-000000000001';

function createPendingVideo() {
  return VideoEntity.fromPersistence({
    id: videoId,
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 2048,
    duration: null,
    status: VIDEO_STATUS.PENDING,
    uploadComplete: false,
    storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
    storageHlsPrefix: `videos/${videoId}/hls/`,
    errorReason: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  });
}

function createUseCase() {
  const videoRepository = {
    findById: vi.fn(),
  };
  const storageClient = {
    getPresignedUploadUrl: vi.fn(),
  };

  const useCase = new RenewUploadUrlUseCase(videoRepository as never, storageClient as never);

  return { useCase, videoRepository, storageClient };
}

describe('RenewUploadUrlUseCase', () => {
  it('retorna nova presigned URL para vídeo pending', async () => {
    const video = createPendingVideo();
    const { useCase, videoRepository, storageClient } = createUseCase();

    videoRepository.findById.mockResolvedValue(video);
    storageClient.getPresignedUploadUrl.mockResolvedValue('https://storage/new-presigned-url');

    const result = await useCase.execute(videoId);

    expect(videoRepository.findById).toHaveBeenCalledWith(videoId);
    expect(storageClient.getPresignedUploadUrl).toHaveBeenCalledWith(
      `videos/${videoId}/original/movie.mp4`,
    );
    expect(result).toEqual({
      id: videoId,
      uploadUrl: 'https://storage/new-presigned-url',
      status: VIDEO_STATUS.PENDING,
    });
  });

  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const { useCase, videoRepository, storageClient } = createUseCase();
    videoRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
    expect(storageClient.getPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('lança InvalidVideoStatusError quando status não é pending', async () => {
    const video = createPendingVideo();
    const queuedVideo = VideoEntity.fromPersistence({
      ...video,
      status: VIDEO_STATUS.QUEUED,
    });
    const { useCase, videoRepository, storageClient } = createUseCase();

    videoRepository.findById.mockResolvedValue(queuedVideo);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(InvalidVideoStatusError);
    expect(storageClient.getPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('InvalidVideoStatusError expõe code VIDEO_NOT_READY', async () => {
    const video = createPendingVideo();
    const queuedVideo = VideoEntity.fromPersistence({
      ...video,
      status: VIDEO_STATUS.QUEUED,
    });
    const { useCase, videoRepository } = createUseCase();

    videoRepository.findById.mockResolvedValue(queuedVideo);

    await expect(useCase.execute(videoId)).rejects.toMatchObject({
      code: ERROR_CODE.VIDEO_NOT_READY,
    });
  });
});
