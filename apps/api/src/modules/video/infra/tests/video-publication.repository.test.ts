import { describe, expect, it, vi } from 'vitest';

import { VIDEO_STATUS, type VideoStatus } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { VideoRepository } from '../video.repository.ts';

const videoId = '00000000-0000-4000-8000-000000000003';

interface VideoRowFixture {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  duration: number | null;
  status: VideoStatus;
  uploadComplete: boolean;
  storageOriginalKey: string;
  storageHlsPrefix: string | null;
  thumbnailKey: string | null;
  errorReason: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const videoRow: VideoRowFixture = {
  id: videoId,
  title: 'Meu filme',
  fileName: 'movie.mp4',
  fileSize: 4294967296,
  duration: 7240,
  status: VIDEO_STATUS.READY,
  uploadComplete: true,
  storageOriginalKey: `videos/${videoId}/original/movie.mp4`,
  storageHlsPrefix: `videos/${videoId}/hls`,
  thumbnailKey: null,
  errorReason: null,
  publishedAt: new Date('2026-06-01T12:00:00.000Z'),
  createdAt: new Date('2026-06-20T12:00:00.000Z'),
  updatedAt: new Date('2026-06-20T12:00:00.000Z'),
};

function createUpdateMockDb(row: VideoRowFixture | null) {
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(row ? [row] : []),
  };

  const db = {
    update: vi.fn().mockReturnValue(updateChain),
  };

  return { db, updateChain };
}

describe('VideoRepository — publicação', () => {
  it('updatePublishedAt persiste data e retorna entity', async () => {
    const publishedAt = new Date('2026-07-10T12:00:00.000Z');
    const updatedRow = {
      ...videoRow,
      publishedAt,
      updatedAt: new Date('2026-07-04T12:00:00.000Z'),
    };

    const { db, updateChain } = createUpdateMockDb(updatedRow);
    const repository = new VideoRepository(db as never);

    const result = await repository.updatePublishedAt(videoId, publishedAt);

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ publishedAt }),
    );
    expect(result).toBeInstanceOf(VideoEntity);
    expect(result?.publishedAt).toEqual(publishedAt);
  });

  it('updatePublishedAt com null despublica vídeo', async () => {
    const updatedRow = {
      ...videoRow,
      publishedAt: null,
      updatedAt: new Date('2026-07-04T12:00:00.000Z'),
    };

    const { db, updateChain } = createUpdateMockDb(updatedRow);
    const repository = new VideoRepository(db as never);

    const result = await repository.updatePublishedAt(videoId, null);

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ publishedAt: null }),
    );
    expect(result?.publishedAt).toBeNull();
  });

  it('updatePublishedAt retorna null quando vídeo não existe', async () => {
    const { db } = createUpdateMockDb(null);
    const repository = new VideoRepository(db as never);

    const result = await repository.updatePublishedAt('missing-id', new Date());

    expect(result).toBeNull();
  });

  it('list aplica filtro publishedOnly quando informado', async () => {
    const filteredChain = {
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([videoRow]),
    };

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue(filteredChain),
    };

    const db = {
      select: vi.fn().mockReturnValue(selectChain),
    };

    const repository = new VideoRepository(db as never);

    await repository.list({ page: 1, limit: 20, publishedOnly: true });

    expect(selectChain.where).toHaveBeenCalled();
  });

  it('count aplica filtro publishedOnly quando informado', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: 5 }]),
    };

    const db = {
      select: vi.fn().mockReturnValue(selectChain),
    };

    const repository = new VideoRepository(db as never);

    const result = await repository.count({ publishedOnly: true });

    expect(selectChain.where).toHaveBeenCalled();
    expect(result).toBe(5);
  });
});
