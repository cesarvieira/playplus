import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';

import { GetVideoQuery } from '#modules/video/application/get-video.query';

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

describe('GetVideoQuery — thumbnail_url', () => {
  it('retorna thumbnail_url derivada de thumbnailKey', async () => {
    const videoRepository = {
      findById: vi.fn().mockResolvedValue(createVideoWithThumbnail()),
    };
    const query = new GetVideoQuery(videoRepository as never, {} as never, cdnBaseUrl, signerStub);

    const result = await query.execute(videoId, { includeUnpublished: true });

    expect(result.thumbnailUrl).toBe(`${cdnBaseUrl}/${thumbnailKey}?t=${mediaToken}`);
    expect(result.thumbnailKey).toBe(thumbnailKey);
  });

  it('retorna thumbnail_url null quando thumbnailKey é null', async () => {
    const videoRepository = {
      findById: vi.fn().mockResolvedValue(
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
      ),
    };
    const query = new GetVideoQuery(videoRepository as never, {} as never, cdnBaseUrl, signerStub);

    const result = await query.execute(videoId, { includeUnpublished: true });

    expect(result.thumbnailUrl).toBeNull();
  });
});
