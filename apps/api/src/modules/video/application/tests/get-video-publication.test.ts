import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS, VideoNotFoundError } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { GetVideoQuery } from '#modules/video/application/get-video.query';

const videoId = '00000000-0000-4000-8000-000000000001';
const createdAt = new Date('2025-01-01T00:00:00Z');
const cdnBaseUrl = 'http://localhost:8080/media';

function createVideo(publishedAt: Date | null) {
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
    publishedAt,
    createdAt,
    updatedAt: createdAt,
  });
}

function createQuery() {
  const videoRepository = {
    findById: vi.fn(),
    setUploadComplete: vi.fn(),
  };
  const storageClient = { objectExists: vi.fn() };
  const query = new GetVideoQuery(
    videoRepository as never,
    storageClient as never,
    cdnBaseUrl,
    { sign: () => 'signed-media-token' } as never,
  );

  return { query, videoRepository };
}

describe('GetVideoQuery — publicação', () => {
  it('lança VideoNotFoundError para viewer quando vídeo não está publicado', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(null));

    await expect(query.execute(videoId, { includeUnpublished: false })).rejects.toBeInstanceOf(
      VideoNotFoundError,
    );
  });

  it('lança VideoNotFoundError para viewer quando publicação é futura', async () => {
    const { query, videoRepository } = createQuery();
    const futureDate = new Date(Date.now() + 86_400_000);
    videoRepository.findById.mockResolvedValue(createVideo(futureDate));

    await expect(query.execute(videoId, { includeUnpublished: false })).rejects.toBeInstanceOf(
      VideoNotFoundError,
    );
  });

  it('retorna vídeo publicado para viewer', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(new Date('2020-01-01T00:00:00Z')));

    const result = await query.execute(videoId, { includeUnpublished: false });

    expect(result.id).toBe(videoId);
    expect(result.publishedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('retorna rascunho para admin (includeUnpublished true)', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(null));

    const result = await query.execute(videoId, { includeUnpublished: true });

    expect(result.publishedAt).toBeNull();
  });
});
