import { describe, expect, it, vi } from 'vitest';
import {
  ERROR_CODE,
  ValidationError,
  VIDEO_STATUS,
  VideoNotFoundError,
  buildTranscodeJobId,
} from '@playplus/shared';

import { JobAlreadyQueuedError } from '#modules/video/domain/job-already-queued.error';
import { InvalidVideoStatusError } from '#modules/video/domain/invalid-video-status.error';
import { VideoEntity } from '#modules/video/domain/video.entity';

import { EnqueueTranscodeUseCase } from '#modules/video/application/enqueue-transcode.use-case';

const videoId = '00000000-0000-4000-8000-000000000001';

function createVideo(
  status: typeof VIDEO_STATUS.PENDING | typeof VIDEO_STATUS.ERROR | typeof VIDEO_STATUS.READY,
) {
  return VideoEntity.fromPersistence({
    id: videoId,
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 2048,
    duration: null,
    status,
    uploadComplete: false,
    storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
    storageHlsPrefix: `videos/${videoId}/hls/`,
    thumbnailKey: null,
    errorReason: status === VIDEO_STATUS.ERROR ? 'FFmpeg falhou' : null,
    publishedAt: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  });
}

function createUseCase() {
  const videoRepository = {
    findById: vi.fn(),
    setUploadComplete: vi.fn(),
    updateStatus: vi.fn(),
  };
  const storageClient = {
    objectExists: vi.fn(),
  };
  const transcodeQueue = {
    isJobActive: vi.fn(),
    removeFailedJob: vi.fn(),
    removeOrphanJob: vi.fn(),
    enqueue: vi.fn(),
  };

  const useCase = new EnqueueTranscodeUseCase(
    videoRepository as never,
    storageClient as never,
    transcodeQueue as never,
  );

  return { useCase, videoRepository, storageClient, transcodeQueue };
}

describe('EnqueueTranscodeUseCase', () => {
  it('enfileira transcode para vídeo pending com upload concluído', async () => {
    const video = createVideo(VIDEO_STATUS.PENDING);
    const { useCase, videoRepository, storageClient, transcodeQueue } = createUseCase();

    videoRepository.findById.mockResolvedValue(video);
    transcodeQueue.isJobActive.mockResolvedValue(false);
    storageClient.objectExists.mockResolvedValue(true);
    videoRepository.setUploadComplete.mockResolvedValue(video);
    videoRepository.updateStatus.mockResolvedValue(video);

    const result = await useCase.execute(videoId);

    expect(storageClient.objectExists).toHaveBeenCalledWith(`videos/${videoId}/original/movie.mp4`);
    expect(videoRepository.setUploadComplete).toHaveBeenCalledWith(videoId, true);
    expect(videoRepository.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.QUEUED);
    expect(transcodeQueue.enqueue).toHaveBeenCalledWith({
      videoId,
      storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
      fileName: 'movie.mp4',
      fileSize: 2048,
    });
    expect(result).toEqual({
      jobId: buildTranscodeJobId(videoId),
      status: VIDEO_STATUS.QUEUED,
    });
  });

  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const { useCase, videoRepository } = createUseCase();
    videoRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('lança ValidationError quando upload não está no storage', async () => {
    const video = createVideo(VIDEO_STATUS.PENDING);
    const { useCase, videoRepository, storageClient, transcodeQueue } = createUseCase();

    videoRepository.findById.mockResolvedValue(video);
    transcodeQueue.isJobActive.mockResolvedValue(false);
    storageClient.objectExists.mockResolvedValue(false);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(videoId)).rejects.toMatchObject({
      code: ERROR_CODE.VALIDATION_ERROR,
      message: 'Upload não concluído',
    });
  });

  it('lança JobAlreadyQueuedError quando job já está ativo na fila', async () => {
    const video = createVideo(VIDEO_STATUS.PENDING);
    const { useCase, videoRepository, transcodeQueue } = createUseCase();

    videoRepository.findById.mockResolvedValue(video);
    transcodeQueue.isJobActive.mockResolvedValue(true);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(JobAlreadyQueuedError);
  });

  it('lança InvalidVideoStatusError para vídeo ready', async () => {
    const video = createVideo(VIDEO_STATUS.READY);
    const { useCase, videoRepository, transcodeQueue } = createUseCase();

    videoRepository.findById.mockResolvedValue(video);
    transcodeQueue.isJobActive.mockResolvedValue(false);

    await expect(useCase.execute(videoId)).rejects.toBeInstanceOf(InvalidVideoStatusError);
    await expect(useCase.execute(videoId)).rejects.toMatchObject({
      code: ERROR_CODE.VIDEO_NOT_READY,
    });
  });

  it('remove job failed e re-enfileira para vídeo em error', async () => {
    const video = createVideo(VIDEO_STATUS.ERROR);
    const { useCase, videoRepository, storageClient, transcodeQueue } = createUseCase();

    videoRepository.findById.mockResolvedValue(video);
    transcodeQueue.isJobActive.mockResolvedValue(false);
    storageClient.objectExists.mockResolvedValue(true);
    videoRepository.setUploadComplete.mockResolvedValue(video);
    videoRepository.updateStatus.mockResolvedValue(video);

    await useCase.execute(videoId);

    expect(transcodeQueue.removeOrphanJob).toHaveBeenCalledWith(videoId);
    expect(videoRepository.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.QUEUED, {
      errorReason: null,
    });
    expect(transcodeQueue.enqueue).toHaveBeenCalled();
  });
});
