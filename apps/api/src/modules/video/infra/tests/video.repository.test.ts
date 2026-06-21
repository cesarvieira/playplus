import { describe, expect, it, vi } from 'vitest';

import { VIDEO_STATUS, type VideoStatus } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';
import { VideoRepository } from '../video.repository.ts';

const videoId = '00000000-0000-4000-8000-000000000002';

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
  errorReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const videoRow: VideoRowFixture = {
  id: videoId,
  title: 'Meu filme',
  fileName: 'movie.mp4',
  fileSize: 4294967296,
  duration: null,
  status: VIDEO_STATUS.PENDING,
  uploadComplete: false,
  storageOriginalKey: 'videos/00000000-0000-4000-8000-000000000002/original/movie.mp4',
  storageHlsPrefix: null,
  errorReason: null,
  createdAt: new Date('2026-06-20T12:00:00.000Z'),
  updatedAt: new Date('2026-06-20T12:00:00.000Z'),
};

function createSelectMockDb(rows: (typeof videoRow)[]) {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  };

  const findByIdChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };

  const db = {
    select: vi.fn().mockImplementation(() => selectChain),
  };

  return { db, selectChain, findByIdChain };
}

function createInsertMockDb(row: VideoRowFixture) {
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([row]),
  };

  const db = {
    insert: vi.fn().mockReturnValue(insertChain),
  };

  return { db, insertChain };
}

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

function createCountMockDb(total: number) {
  const selectChain = {
    from: vi.fn().mockResolvedValue([{ total }]),
    where: vi.fn().mockResolvedValue([{ total }]),
  };

  const db = {
    select: vi.fn().mockReturnValue(selectChain),
  };

  return { db, selectChain };
}

describe('VideoRepository', () => {
  it('create persiste vídeo pending com storage_original_key correta', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(videoId);

    const expectedRow = {
      ...videoRow,
      storageOriginalKey: 'videos/00000000-0000-4000-8000-000000000002/original/movie.mp4',
    };

    const { db, insertChain } = createInsertMockDb(expectedRow);
    const repository = new VideoRepository(db as never);

    const result = await repository.create({
      title: 'Meu filme',
      fileName: 'movie.mp4',
      fileSize: 4294967296,
    });

    expect(db.insert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: videoId,
        status: VIDEO_STATUS.PENDING,
        uploadComplete: false,
        storageOriginalKey: 'videos/00000000-0000-4000-8000-000000000002/original/movie.mp4',
      }),
    );
    expect(result).toBeInstanceOf(VideoEntity);
    expect(result.status).toBe(VIDEO_STATUS.PENDING);
    expect(result.storageOriginalKey).toBe(
      'videos/00000000-0000-4000-8000-000000000002/original/movie.mp4',
    );
  });

  it('findById retorna VideoEntity quando existe', async () => {
    const findByIdChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([videoRow]),
    };

    const db = {
      select: vi.fn().mockReturnValue(findByIdChain),
    };

    const repository = new VideoRepository(db as never);

    const result = await repository.findById(videoId);

    expect(findByIdChain.limit).toHaveBeenCalledWith(1);
    expect(result).toBeInstanceOf(VideoEntity);
    expect(result?.id).toBe(videoRow.id);
  });

  it('findById retorna null quando não existe', async () => {
    const { db } = createSelectMockDb([]);
    const repository = new VideoRepository(db as never);

    const result = await repository.findById('missing-id');

    expect(result).toBeNull();
  });

  it('updateStatus atualiza status e retorna entity', async () => {
    const updatedRow = {
      ...videoRow,
      status: VIDEO_STATUS.QUEUED,
      updatedAt: new Date('2026-06-20T14:00:00.000Z'),
    };

    const { db, updateChain } = createUpdateMockDb(updatedRow);
    const repository = new VideoRepository(db as never);

    const result = await repository.updateStatus('video-id', VIDEO_STATUS.QUEUED);

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: VIDEO_STATUS.QUEUED }),
    );
    expect(result?.status).toBe(VIDEO_STATUS.QUEUED);
  });

  it('setUploadComplete atualiza flag e retorna entity', async () => {
    const updatedRow = {
      ...videoRow,
      uploadComplete: true,
      updatedAt: new Date('2026-06-20T14:00:00.000Z'),
    };

    const { db, updateChain } = createUpdateMockDb(updatedRow);
    const repository = new VideoRepository(db as never);

    const result = await repository.setUploadComplete('video-id', true);

    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ uploadComplete: true }));
    expect(result?.uploadComplete).toBe(true);
  });

  it('list retorna entidades paginadas', async () => {
    const { db, selectChain } = createSelectMockDb([videoRow]);
    const repository = new VideoRepository(db as never);

    const result = await repository.list({ page: 2, limit: 10 });

    expect(selectChain.offset).toHaveBeenCalledWith(10);
    expect(selectChain.limit).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(VideoEntity);
  });

  it('list aplica filtro de status quando informado', async () => {
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

    await repository.list({ page: 1, limit: 20, status: VIDEO_STATUS.READY });

    expect(selectChain.where).toHaveBeenCalled();
  });

  it('count retorna total', async () => {
    const { db } = createCountMockDb(12);
    const repository = new VideoRepository(db as never);

    const result = await repository.count();

    expect(result).toBe(12);
  });

  it('count aplica filtro de status quando informado', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: 3 }]),
    };

    const db = {
      select: vi.fn().mockReturnValue(selectChain),
    };

    const repository = new VideoRepository(db as never);

    await repository.count({ status: VIDEO_STATUS.ERROR });

    expect(selectChain.where).toHaveBeenCalled();
  });
});
