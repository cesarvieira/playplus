import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';

import { ListVideosQuery } from '#modules/video/application/list-videos.query';

const videoId = '00000000-0000-4000-8000-000000000001';
const createdAt = new Date('2025-01-01T00:00:00Z');
const cdnBaseUrl = 'http://localhost:8080/media';
const thumbnailKey = `videos/${videoId}/hls/thumbnail.jpg`;
const mediaToken = 'signed-media-token';
const signerStub = { sign: () => mediaToken } as never;

function createVideoWithThumbnail() {
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
    thumbnailKey,
    errorReason: null,
    publishedAt: null,
    createdAt,
    updatedAt: createdAt,
  });
}

describe('ListVideosQuery — thumbnail_url', () => {
  it('retorna thumbnail_url derivada de thumbnailKey na listagem', async () => {
    const videoRepository = {
      list: vi.fn().mockResolvedValue([createVideoWithThumbnail()]),
      count: vi.fn().mockResolvedValue(1),
    };
    const query = new ListVideosQuery(videoRepository as never, {} as never, cdnBaseUrl, signerStub);

    const result = await query.execute();

    expect(result.data[0]?.thumbnailUrl).toBe(`${cdnBaseUrl}/${thumbnailKey}?t=${mediaToken}`);
    expect(result.data[0]?.thumbnailKey).toBe(thumbnailKey);
  });

  it('retorna thumbnail_url null quando thumbnailKey é null', async () => {
    const videoRepository = {
      list: vi.fn().mockResolvedValue([
        VideoEntity.fromPersistence({
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
        }),
      ]),
      count: vi.fn().mockResolvedValue(1),
    };
    const query = new ListVideosQuery(videoRepository as never, {} as never, cdnBaseUrl, signerStub);

    const result = await query.execute();

    expect(result.data[0]?.thumbnailUrl).toBeNull();
  });
});
