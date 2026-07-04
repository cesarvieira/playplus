import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';

import { resolveUploadComplete } from '#modules/video/application/resolve-upload-complete';

const videoId = '00000000-0000-4000-8000-000000000001';

function createPendingVideo(uploadComplete: boolean) {
  return VideoEntity.fromPersistence({
    id: videoId,
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 2048,
    duration: null,
    status: VIDEO_STATUS.PENDING,
    uploadComplete,
    storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
    storageHlsPrefix: `videos/${videoId}/hls/`,
    thumbnailKey: null,
    errorReason: null,
    publishedAt: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  });
}

function createReadyVideo() {
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
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  });
}

describe('resolveUploadComplete', () => {
  it('retorna true sem HEAD quando upload_complete já é true', async () => {
    const video = createPendingVideo(true);
    const storageClient = { objectExists: vi.fn() };
    const videoRepository = { setUploadComplete: vi.fn() };

    const result = await resolveUploadComplete(
      video,
      storageClient as never,
      videoRepository as never,
    );

    expect(result).toBe(true);
    expect(storageClient.objectExists).not.toHaveBeenCalled();
    expect(videoRepository.setUploadComplete).not.toHaveBeenCalled();
  });

  it('atualiza banco e retorna true quando HEAD encontra objeto', async () => {
    const video = createPendingVideo(false);
    const storageClient = { objectExists: vi.fn().mockResolvedValue(true) };
    const videoRepository = { setUploadComplete: vi.fn().mockResolvedValue(null) };

    const result = await resolveUploadComplete(
      video,
      storageClient as never,
      videoRepository as never,
    );

    expect(result).toBe(true);
    expect(storageClient.objectExists).toHaveBeenCalledWith(video.storageOriginalKey);
    expect(videoRepository.setUploadComplete).toHaveBeenCalledWith(videoId, true);
  });

  it('retorna false sem atualizar banco quando HEAD não encontra objeto', async () => {
    const video = createPendingVideo(false);
    const storageClient = { objectExists: vi.fn().mockResolvedValue(false) };
    const videoRepository = { setUploadComplete: vi.fn() };

    const result = await resolveUploadComplete(
      video,
      storageClient as never,
      videoRepository as never,
    );

    expect(result).toBe(false);
    expect(videoRepository.setUploadComplete).not.toHaveBeenCalled();
  });

  it('retorna uploadComplete atual para status diferente de pending', async () => {
    const video = createReadyVideo();
    const storageClient = { objectExists: vi.fn() };
    const videoRepository = { setUploadComplete: vi.fn() };

    const result = await resolveUploadComplete(
      video,
      storageClient as never,
      videoRepository as never,
    );

    expect(result).toBe(true);
    expect(storageClient.objectExists).not.toHaveBeenCalled();
  });
});
