import { describe, expect, it } from 'vitest';

import { buildThumbnailUrl } from '#modules/video/application/get-video.query';

const videoId = '00000000-0000-4000-8000-000000000001';
const cdnBaseUrl = 'http://localhost:8080/media';
const thumbnailKey = `videos/${videoId}/hls/thumbnail.jpg`;

describe('buildThumbnailUrl', () => {
  it('monta thumbnail_url com CDN_BASE_URL e thumbnailKey', () => {
    expect(buildThumbnailUrl(cdnBaseUrl, thumbnailKey)).toBe(
      `http://localhost:8080/media/videos/${videoId}/hls/thumbnail.jpg`,
    );
  });

  it('remove barra final do CDN_BASE_URL', () => {
    expect(buildThumbnailUrl(`${cdnBaseUrl}/`, thumbnailKey)).toBe(
      `http://localhost:8080/media/videos/${videoId}/hls/thumbnail.jpg`,
    );
  });
});
