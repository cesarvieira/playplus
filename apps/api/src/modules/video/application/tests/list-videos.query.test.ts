import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';

import { ListVideosQuery } from '#modules/video/application/list-videos.query';

const videoId = '00000000-0000-4000-8000-000000000001';
const createdAt = new Date('2025-01-01T00:00:00Z');

function createVideo(status: typeof VIDEO_STATUS.PENDING | typeof VIDEO_STATUS.READY) {
  return VideoEntity.fromPersistence({
    id: videoId,
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 2048,
    duration: status === VIDEO_STATUS.READY ? 7240 : null,
    status,
    uploadComplete: status === VIDEO_STATUS.READY,
    storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
    storageHlsPrefix: `videos/${videoId}/hls/`,
    thumbnailKey: null,
    errorReason: null,
    publishedAt: null,
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
  const storageClient = {
    objectExists: vi.fn(),
  };
  const query = new ListVideosQuery(videoRepository as never, storageClient as never, 'http://localhost:8080/media');

  return { query, videoRepository, storageClient };
}

describe('ListVideosQuery', () => {
  it('retorna lista paginada com meta', async () => {
    const { query, videoRepository } = createQuery();
    const readyVideo = createVideo(VIDEO_STATUS.READY);

    videoRepository.list.mockResolvedValue([readyVideo]);
    videoRepository.count.mockResolvedValue(1);

    const result = await query.execute({ page: 1, limit: 20 });

    expect(videoRepository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
      publishedOnly: true,
    });
    expect(result).toEqual({
      data: [
        {
          id: videoId,
          title: 'Meu filme',
          duration: 7240,
          thumbnailKey: null,
          thumbnailUrl: null,
          status: VIDEO_STATUS.READY,
          publishedAt: null,
          createdAt: createdAt.toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 20 },
    });
  });

  it('repassa filtro de status ao repositório', async () => {
    const { query, videoRepository } = createQuery();

    videoRepository.list.mockResolvedValue([]);
    videoRepository.count.mockResolvedValue(0);

    await query.execute({ status: VIDEO_STATUS.PROCESSING });

    expect(videoRepository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: VIDEO_STATUS.PROCESSING,
      publishedOnly: true,
    });
    expect(videoRepository.count).toHaveBeenCalledWith({
      status: VIDEO_STATUS.PROCESSING,
      publishedOnly: true,
    });
  });

  it('normaliza page mínimo 1 e limit máximo 100', async () => {
    const { query, videoRepository } = createQuery();

    videoRepository.list.mockResolvedValue([]);
    videoRepository.count.mockResolvedValue(0);

    await query.execute({ page: 0, limit: 500 });

    expect(videoRepository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      status: undefined,
      publishedOnly: true,
    });
  });

  it('inclui uploadComplete em pending após lazy HEAD', async () => {
    const { query, videoRepository, storageClient } = createQuery();
    const pendingVideo = createVideo(VIDEO_STATUS.PENDING);

    videoRepository.list.mockResolvedValue([pendingVideo]);
    videoRepository.count.mockResolvedValue(1);
    storageClient.objectExists.mockResolvedValue(true);
    videoRepository.setUploadComplete.mockResolvedValue(null);

    const result = await query.execute();

    expect(result.data[0]?.uploadComplete).toBe(true);
    expect(videoRepository.setUploadComplete).toHaveBeenCalledWith(videoId, true);
  });

  it('omite uploadComplete em vídeos ready', async () => {
    const { query, videoRepository } = createQuery();

    videoRepository.list.mockResolvedValue([createVideo(VIDEO_STATUS.READY)]);
    videoRepository.count.mockResolvedValue(1);

    const result = await query.execute();

    expect(result.data[0]).not.toHaveProperty('uploadComplete');
  });
});
