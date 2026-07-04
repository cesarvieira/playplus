import { describe, expect, it, vi } from 'vitest';

import { VIDEO_STATUS } from '@playplus/shared';

import { buildStorageHlsPrefix, buildStorageOriginalKey, VideoEntity } from '../video.entity.ts';

describe('VideoEntity', () => {
  const persistenceProps = {
    id: 'video-id',
    title: 'Meu filme',
    fileName: 'movie.mp4',
    fileSize: 1024,
    duration: 3600,
    status: VIDEO_STATUS.READY,
    uploadComplete: true,
    storageOriginalKey: 'videos/video-id/original/movie.mp4',
    storageHlsPrefix: 'videos/video-id/hls/',
    thumbnailKey: null,
    errorReason: null,
    publishedAt: null,
    createdAt: new Date('2026-06-20T12:00:00.000Z'),
    updatedAt: new Date('2026-06-20T13:00:00.000Z'),
  };

  it('buildStorageOriginalKey monta caminho esperado', () => {
    expect(buildStorageOriginalKey('abc-123', 'clip.mkv')).toBe('videos/abc-123/original/clip.mkv');
  });

  it('buildStorageHlsPrefix monta caminho esperado', () => {
    expect(buildStorageHlsPrefix('abc-123')).toBe('videos/abc-123/hls/');
  });

  it('createNew gera id, status pending e storage key correta', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');

    const entity = VideoEntity.createNew({
      title: 'Novo vídeo',
      fileName: 'upload.mp4',
      fileSize: 2048,
    });

    expect(entity.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(entity.status).toBe(VIDEO_STATUS.PENDING);
    expect(entity.uploadComplete).toBe(false);
    expect(entity.storageOriginalKey).toBe(
      'videos/00000000-0000-4000-8000-000000000001/original/upload.mp4',
    );
    expect(entity.duration).toBeNull();
    expect(entity.storageHlsPrefix).toBe('videos/00000000-0000-4000-8000-000000000001/hls/');
    expect(entity.errorReason).toBeNull();
    expect(entity.thumbnailKey).toBeNull();
    expect(entity.publishedAt).toBeNull();
  });

  it('preserva campos via fromPersistence', () => {
    const entity = VideoEntity.fromPersistence(persistenceProps);

    expect(entity.id).toBe(persistenceProps.id);
    expect(entity.title).toBe(persistenceProps.title);
    expect(entity.fileName).toBe(persistenceProps.fileName);
    expect(entity.fileSize).toBe(persistenceProps.fileSize);
    expect(entity.duration).toBe(persistenceProps.duration);
    expect(entity.status).toBe(persistenceProps.status);
    expect(entity.uploadComplete).toBe(persistenceProps.uploadComplete);
    expect(entity.storageOriginalKey).toBe(persistenceProps.storageOriginalKey);
  });

  it('toVideo serializa datas em ISO string', () => {
    const entity = VideoEntity.fromPersistence(persistenceProps);

    const video = entity.toVideo();

    expect(video).toEqual({
      id: persistenceProps.id,
      title: persistenceProps.title,
      fileName: persistenceProps.fileName,
      fileSize: persistenceProps.fileSize,
      duration: persistenceProps.duration,
      status: persistenceProps.status,
      uploadComplete: persistenceProps.uploadComplete,
      storageOriginalKey: persistenceProps.storageOriginalKey,
      storageHlsPrefix: persistenceProps.storageHlsPrefix,
      thumbnailKey: null,
      thumbnailUrl: null,
      errorReason: persistenceProps.errorReason,
      publishedAt: null,
      createdAt: persistenceProps.createdAt.toISOString(),
      updatedAt: persistenceProps.updatedAt.toISOString(),
    });
  });
});
