import { describe, expect, it } from 'vitest';

import { MediaTokenSigner } from '#infra/media/media-token';
import {
  authorizeMediaRequest,
  extractObjectKey,
  extractToken,
} from '#modules/video/http/media-authorization';

const secret = 'test-media-token-secret-at-least-32-chars';
const bucket = 'playplus';
const videoId = '00000000-0000-4000-8000-000000000001';
const objectKey = `videos/${videoId}/hls/master.m3u8`;

function signerWithToken() {
  const signer = new MediaTokenSigner(secret, 600);
  const token = signer.sign(`videos/${videoId}`);
  return { signer, token };
}

describe('extractObjectKey', () => {
  it('remove bucket e query do URI', () => {
    expect(extractObjectKey(`/${bucket}/${objectKey}?t=abc`, bucket)).toBe(objectKey);
  });

  it('funciona sem bucket no path', () => {
    expect(extractObjectKey(`/${objectKey}`, bucket)).toBe(objectKey);
  });

  it('retorna null para path vazio', () => {
    expect(extractObjectKey(`/${bucket}/`, bucket)).toBeNull();
  });
});

describe('extractToken', () => {
  it('extrai token do query param t', () => {
    expect(extractToken(`/${bucket}/${objectKey}?t=the-token`)).toBe('the-token');
  });

  it('retorna null sem query', () => {
    expect(extractToken(`/${bucket}/${objectKey}`)).toBeNull();
  });
});

describe('authorizeMediaRequest', () => {
  it('autoriza GET com token válido sob o prefixo', () => {
    const { signer, token } = signerWithToken();

    expect(
      authorizeMediaRequest(signer, {
        method: 'GET',
        uri: `/${bucket}/${objectKey}?t=${token}`,
        bucket,
      }),
    ).toBe(true);
  });

  it('autoriza um segmento com o mesmo token do manifesto', () => {
    const { signer, token } = signerWithToken();
    const segmentUri = `/${bucket}/videos/${videoId}/hls/720p/segment_003.ts?t=${token}`;

    expect(authorizeMediaRequest(signer, { method: 'GET', uri: segmentUri, bucket })).toBe(true);
  });

  it('nega método não-leitura (scanner tentando POST)', () => {
    const { signer, token } = signerWithToken();

    expect(
      authorizeMediaRequest(signer, {
        method: 'POST',
        uri: `/${bucket}/${objectKey}?t=${token}`,
        bucket,
      }),
    ).toBe(false);
  });

  it('nega requisição sem token (scanner/hotlink)', () => {
    const { signer } = signerWithToken();

    expect(
      authorizeMediaRequest(signer, {
        method: 'GET',
        uri: `/${bucket}/${objectKey}`,
        bucket,
      }),
    ).toBe(false);
  });

  it('nega token válido para objeto de outro vídeo', () => {
    const { signer, token } = signerWithToken();
    const otherKey = 'videos/00000000-0000-4000-8000-000000000002/hls/master.m3u8';

    expect(
      authorizeMediaRequest(signer, {
        method: 'GET',
        uri: `/${bucket}/${otherKey}?t=${token}`,
        bucket,
      }),
    ).toBe(false);
  });

  it('nega token expirado', () => {
    const signer = new MediaTokenSigner(secret, 600);
    const issuedAt = new Date('2026-07-09T00:00:00Z');
    const token = signer.sign(`videos/${videoId}`, issuedAt);
    const afterExpiry = new Date(issuedAt.getTime() + 601 * 1000);

    expect(
      authorizeMediaRequest(
        signer,
        { method: 'GET', uri: `/${bucket}/${objectKey}?t=${token}`, bucket },
        afterExpiry,
      ),
    ).toBe(false);
  });
});
