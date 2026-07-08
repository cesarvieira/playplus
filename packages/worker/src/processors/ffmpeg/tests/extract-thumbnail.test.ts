import { describe, expect, it } from 'vitest';

import {
  buildFallbackThumbnailArgs,
  buildWindowedThumbnailArgs,
  resolveThumbnailWindow,
} from '../extract-thumbnail.ts';

describe('resolveThumbnailWindow', () => {
  it('usa janela longa para filmes de 2h', () => {
    expect(resolveThumbnailWindow(7200)).toEqual({
      seekStartSeconds: 576,
      windowSeconds: 45,
      useFallback: false,
    });
  });

  it('analisa vídeo curto desde o início', () => {
    expect(resolveThumbnailWindow(5)).toEqual({
      seekStartSeconds: 0,
      windowSeconds: 5,
      useFallback: false,
    });
  });

  it('usa janela proporcional para vídeos médios', () => {
    expect(resolveThumbnailWindow(120)).toEqual({
      seekStartSeconds: 9.6,
      windowSeconds: 30,
      useFallback: false,
    });
  });

  it('marca fallback quando duração é inválida', () => {
    expect(resolveThumbnailWindow(0)).toEqual({
      seekStartSeconds: 0,
      windowSeconds: 0,
      useFallback: true,
    });
  });

  it('usa duração inteira para clipes menores que 3s', () => {
    expect(resolveThumbnailWindow(2)).toEqual({
      seekStartSeconds: 0,
      windowSeconds: 2,
      useFallback: false,
    });
  });
});

describe('buildWindowedThumbnailArgs', () => {
  it('inclui filtro thumbnail=n=120 na janela principal', () => {
    expect(
      buildWindowedThumbnailArgs('/tmp/movie.mp4', '/tmp/thumbnail.jpg', {
        seekStartSeconds: 9.6,
        windowSeconds: 30,
        useFallback: false,
      }),
    ).toEqual([
      '-ss',
      '9.600',
      '-i',
      '/tmp/movie.mp4',
      '-t',
      '30.000',
      '-vf',
      'thumbnail=n=120',
      '-frames:v',
      '1',
      '-q:v',
      '2',
      '-y',
      '/tmp/thumbnail.jpg',
    ]);
  });
});

describe('buildFallbackThumbnailArgs', () => {
  it('usa seek em duration × 0.5 quando janela é inválida', () => {
    expect(buildFallbackThumbnailArgs('/tmp/movie.mp4', '/tmp/thumbnail.jpg', 0)).toEqual([
      '-ss',
      '0.000',
      '-i',
      '/tmp/movie.mp4',
      '-vframes',
      '1',
      '-q:v',
      '2',
      '-y',
      '/tmp/thumbnail.jpg',
    ]);
  });
});
