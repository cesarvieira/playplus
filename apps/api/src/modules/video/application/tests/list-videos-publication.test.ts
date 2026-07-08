import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { ListVideosQuery } from '#modules/video/application/list-videos.query';

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

function createQuery() {
  const videoRepository = {
    list: vi.fn(),
    count: vi.fn(),
    setUploadComplete: vi.fn(),
  };
  const storageClient = { objectExists: vi.fn() };
  const query = new ListVideosQuery(videoRepository as never, storageClient as never, 'http://cdn.test');

  return { query, videoRepository };
}

describe('ListVideosQuery — publicação', () => {
  it('aplica filtro publishedOnly por padrão', async () => {
    const { query, videoRepository } = createQuery();

    videoRepository.list.mockResolvedValue([createVideo()]);
    videoRepository.count.mockResolvedValue(1);

    await query.execute();

    expect(videoRepository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
      publishedOnly: true,
    });
  });

  it('aplica filtro publishedOnly quando includeUnpublished é false', async () => {
    const { query, videoRepository } = createQuery();

    videoRepository.list.mockResolvedValue([createVideo()]);
    videoRepository.count.mockResolvedValue(1);

    await query.execute({ includeUnpublished: false });

    expect(videoRepository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
      publishedOnly: true,
    });
    expect(videoRepository.count).toHaveBeenCalledWith({
      status: undefined,
      publishedOnly: true,
    });
  });

  it('não aplica filtro publishedOnly para admin (includeUnpublished true)', async () => {
    const { query, videoRepository } = createQuery();

    videoRepository.list.mockResolvedValue([]);
    videoRepository.count.mockResolvedValue(0);

    await query.execute({ includeUnpublished: true });

    expect(videoRepository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
    });
    expect(videoRepository.count).toHaveBeenCalledWith({ status: undefined });
  });
});
