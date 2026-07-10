import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';

import { ReconcileStaleVideosUseCase } from '#modules/video/application/reconcile-stale-videos.use-case';

const videoId = '00000000-0000-4000-8000-000000000001';
const staleDate = new Date('2020-01-01T00:00:00Z');

function createStaleVideo(status: typeof VIDEO_STATUS.QUEUED | typeof VIDEO_STATUS.PROCESSING) {
  return VideoEntity.fromPersistence({
    id: videoId,
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 2048,
    duration: null,
    status,
    uploadComplete: true,
    storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
    storageHlsPrefix: null,
    thumbnailKey: null,
    errorReason: null,
    publishedAt: null,
    createdAt: staleDate,
    updatedAt: staleDate,
  });
}

describe('ReconcileStaleVideosUseCase', () => {
  it('re-enfileira vídeo queued stale sem job', async () => {
    const video = createStaleVideo(VIDEO_STATUS.QUEUED);
    const videoRepository = {
      findStaleByStatus: vi.fn().mockResolvedValue([video]),
      updateStatus: vi.fn(),
    };
    const transcodeQueue = {
      getJobState: vi.fn().mockResolvedValue(null),
      removeOrphanJob: vi.fn(),
      enqueue: vi.fn(),
    };
    const eventPublisher = {
      publishVideoStatus: vi.fn(),
      publishVideoError: vi.fn(),
    };

    const useCase = new ReconcileStaleVideosUseCase(
      videoRepository as never,
      transcodeQueue as never,
      eventPublisher as never,
      120,
    );

    const result = await useCase.execute();

    expect(result).toEqual({ requeued: 1, markedError: 0 });
    expect(transcodeQueue.enqueue).toHaveBeenCalled();
  });

  it('marca processing stale sem job ativo como error', async () => {
    const video = createStaleVideo(VIDEO_STATUS.PROCESSING);
    const videoRepository = {
      findStaleByStatus: vi.fn().mockResolvedValue([video]),
      updateStatus: vi.fn(),
    };
    const transcodeQueue = {
      getJobState: vi.fn().mockResolvedValue(null),
      removeOrphanJob: vi.fn(),
      enqueue: vi.fn(),
    };
    const eventPublisher = {
      publishVideoStatus: vi.fn(),
      publishVideoError: vi.fn(),
    };

    const useCase = new ReconcileStaleVideosUseCase(
      videoRepository as never,
      transcodeQueue as never,
      eventPublisher as never,
      120,
    );

    const result = await useCase.execute();

    expect(result).toEqual({ requeued: 0, markedError: 1 });
    expect(videoRepository.updateStatus).toHaveBeenCalledWith(videoId, VIDEO_STATUS.ERROR, {
      errorReason: 'worker_unavailable',
    });
    expect(eventPublisher.publishVideoError).toHaveBeenCalled();
  });
});
