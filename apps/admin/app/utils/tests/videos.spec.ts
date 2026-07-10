import { describe, expect, it } from 'vitest';

import {
  buildVideosListPath,
  capProcessingProgress,
  filterActiveVideos,
  mergeVideoRow,
  type ApiVideoListItem,
} from '../videos';

const baseItem: ApiVideoListItem = {
  id: 'video-1',
  title: 'Teste',
  duration: 120,
  thumbnail_url: null,
  status: 'queued',
  published_at: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};

describe('buildVideosListPath', () => {
  it('monta query de paginação com include_unpublished para admin', () => {
    expect(buildVideosListPath('all', 2, 20)).toBe(
      '/videos?page=2&limit=20&include_unpublished=true',
    );
  });

  it('inclui status ready e error', () => {
    expect(buildVideosListPath('ready', 1, 20)).toBe(
      '/videos?page=1&limit=20&include_unpublished=true&status=ready',
    );
    expect(buildVideosListPath('error', 1, 20)).toBe(
      '/videos?page=1&limit=20&include_unpublished=true&status=error',
    );
  });

  it('não envia status para filtro active', () => {
    expect(buildVideosListPath('active', 1, 20)).toBe(
      '/videos?page=1&limit=20&include_unpublished=true',
    );
  });
});

describe('mergeVideoRow', () => {
  it('sobrepõe status e progresso do patch WS', () => {
    expect(
      mergeVideoRow(baseItem, { status: 'processing', progress: 42 }),
    ).toEqual({
      ...baseItem,
      status: 'processing',
      progress: 42,
      errorReason: undefined,
    });
  });

  it('sobrepõe published_at do patch de publicação', () => {
    expect(
      mergeVideoRow(baseItem, undefined, { published_at: '2030-01-01T00:00:00.000Z' }),
    ).toEqual({
      ...baseItem,
      published_at: '2030-01-01T00:00:00.000Z',
      progress: undefined,
      errorReason: undefined,
    });
  });

  it('usa error_reason do REST quando patch WS não tem motivo', () => {
    expect(
      mergeVideoRow(
        { ...baseItem, status: 'error', error_reason: 'ffmpeg_exit_code_1' },
        { status: 'error' },
      ).errorReason,
    ).toBe('ffmpeg_exit_code_1');
  });
  it('expõe liveUpdatedAt do patch WS', () => {
    expect(
      mergeVideoRow(baseItem, {
        status: 'processing',
        progress: 42,
        lastActivityAt: '2026-07-09T12:00:00.000Z',
      }).liveUpdatedAt,
    ).toBe('2026-07-09T12:00:00.000Z');
  });
});

describe('capProcessingProgress', () => {
  it('limita progresso a 99 enquanto não está ready', () => {
    expect(capProcessingProgress('processing', 100)).toBe(99);
    expect(capProcessingProgress('ready', 100)).toBe(100);
  });
});

describe('filterActiveVideos', () => {
  it('mantém apenas queued e processing', () => {
    const rows = [
      mergeVideoRow({ ...baseItem, id: '1', status: 'queued' }),
      mergeVideoRow({ ...baseItem, id: '2', status: 'processing' }),
      mergeVideoRow({ ...baseItem, id: '3', status: 'ready' }),
    ];

    expect(filterActiveVideos(rows).map(row => row.id)).toEqual(['1', '2']);
  });
});
