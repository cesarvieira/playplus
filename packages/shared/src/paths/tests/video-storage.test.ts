import { describe, expect, it } from 'vitest';

import {
  buildStorageHlsPrefix,
  buildStorageOriginalKey,
  buildStorageThumbnailKey,
  buildStorageVideoPrefix,
} from '../video-storage.ts';

describe('buildStorageVideoPrefix', () => {
  it('monta prefixo raiz do vídeo no storage', () => {
    expect(buildStorageVideoPrefix('abc-123')).toBe('videos/abc-123/');
  });
});

describe('buildStorageOriginalKey', () => {
  it('monta caminho do original no storage', () => {
    expect(buildStorageOriginalKey('abc-123', 'movie.mp4')).toBe('videos/abc-123/original/movie.mp4');
  });
});

describe('buildStorageHlsPrefix', () => {
  it('monta prefixo HLS esperado', () => {
    expect(buildStorageHlsPrefix('abc-123')).toBe('videos/abc-123/hls/');
  });
});

describe('buildStorageThumbnailKey', () => {
  it('monta key de thumbnail no prefixo HLS', () => {
    expect(buildStorageThumbnailKey('abc-123')).toBe('videos/abc-123/hls/thumbnail.jpg');
  });
});
