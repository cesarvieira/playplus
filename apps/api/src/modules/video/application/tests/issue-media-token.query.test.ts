import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS, VideoNotFoundError } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { IssueMediaTokenQuery } from '#modules/video/application/issue-media-token.query';

const videoId = '00000000-0000-4000-8000-000000000001';
const createdAt = new Date('2025-01-01T00:00:00Z');

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
  const videoRepository = { findById: vi.fn() };
  const sign = vi.fn((prefix: string) => `token-for-${prefix}`);
  const query = new IssueMediaTokenQuery(videoRepository as never, { sign } as never);

  return { query, videoRepository, sign };
}

describe('IssueMediaTokenQuery', () => {
  it('lança VideoNotFoundError quando vídeo não existe', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(null);

    await expect(query.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('lança VideoNotFoundError quando vídeo não é visível no catálogo', async () => {
    const { query, videoRepository } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(null));

    await expect(query.execute(videoId)).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('emite token escopado ao prefixo do vídeo quando publicado', async () => {
    const { query, videoRepository, sign } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(new Date('2024-01-01T00:00:00Z')));

    const result = await query.execute(videoId);

    expect(sign).toHaveBeenCalledWith(`videos/${videoId}`);
    expect(result).toEqual({ token: `token-for-videos/${videoId}` });
  });

  it('emite token para vídeo não publicado quando includeUnpublished (admin)', async () => {
    const { query, videoRepository, sign } = createQuery();
    videoRepository.findById.mockResolvedValue(createVideo(null));

    const result = await query.execute(videoId, { includeUnpublished: true });

    expect(sign).toHaveBeenCalledWith(`videos/${videoId}`);
    expect(result.token).toBe(`token-for-videos/${videoId}`);
  });
});
