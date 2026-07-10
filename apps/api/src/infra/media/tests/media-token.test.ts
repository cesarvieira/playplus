import { describe, expect, it } from 'vitest';

import { MediaTokenSigner } from '#infra/media/media-token';

const secret = 'test-media-token-secret-at-least-32-chars';
const videoId = '00000000-0000-4000-8000-000000000001';
const prefix = `videos/${videoId}`;
const masterKey = `videos/${videoId}/hls/master.m3u8`;
const segmentKey = `videos/${videoId}/hls/720p/segment_003.ts`;
const thumbnailKey = `videos/${videoId}/hls/thumbnail.jpg`;

function createSigner(ttlSeconds = 600): MediaTokenSigner {
  return new MediaTokenSigner(secret, ttlSeconds);
}

describe('MediaTokenSigner', () => {
  it('gera token no formato <payload>.<signature>', () => {
    const token = createSigner().sign(prefix);

    expect(token.split('.')).toHaveLength(2);
    expect(token.length).toBeGreaterThan(0);
  });

  it('valida token para qualquer objeto sob o prefixo autorizado', () => {
    const signer = createSigner();
    const token = signer.sign(prefix);

    expect(signer.verify(token, masterKey)).toBe(true);
    expect(signer.verify(token, segmentKey)).toBe(true);
    expect(signer.verify(token, thumbnailKey)).toBe(true);
    expect(signer.verify(token, prefix)).toBe(true);
  });

  it('rejeita objeto fora do prefixo autorizado', () => {
    const signer = createSigner();
    const token = signer.sign(prefix);
    const otherVideoKey = 'videos/00000000-0000-4000-8000-000000000002/hls/master.m3u8';

    expect(signer.verify(token, otherVideoKey)).toBe(false);
  });

  it('não confunde prefixo com outro que o tem como substring', () => {
    const signer = createSigner();
    const token = signer.sign('videos/abc');

    // "videos/abcdef/..." NÃO deve casar com o prefixo "videos/abc".
    expect(signer.verify(token, 'videos/abcdef/hls/master.m3u8')).toBe(false);
  });

  it('rejeita token expirado', () => {
    const signer = createSigner(600);
    const issuedAt = new Date('2026-07-09T00:00:00Z');
    const token = signer.sign(prefix, issuedAt);

    const afterExpiry = new Date(issuedAt.getTime() + 601 * 1000);

    expect(signer.verify(token, masterKey, afterExpiry)).toBe(false);
  });

  it('aceita token dentro da janela de validade', () => {
    const signer = createSigner(600);
    const issuedAt = new Date('2026-07-09T00:00:00Z');
    const token = signer.sign(prefix, issuedAt);

    const beforeExpiry = new Date(issuedAt.getTime() + 599 * 1000);

    expect(signer.verify(token, masterKey, beforeExpiry)).toBe(true);
  });

  it('rejeita token adulterado na assinatura', () => {
    const signer = createSigner();
    const token = signer.sign(prefix);
    const [payload] = token.split('.');
    const tampered = `${payload}.AAAA`;

    expect(signer.verify(tampered, masterKey)).toBe(false);
  });

  it('rejeita token adulterado no payload (elevação de prefixo)', () => {
    const signer = createSigner();
    const token = signer.sign(prefix);
    const [, signature] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ p: 'videos', e: 9_999_999_999 })).toString(
      'base64url',
    );
    const forged = `${forgedPayload}.${signature}`;

    expect(signer.verify(forged, masterKey)).toBe(false);
  });

  it('rejeita token assinado com outro secret', () => {
    const token = new MediaTokenSigner('another-secret-with-at-least-32-characters', 600).sign(prefix);

    expect(createSigner().verify(token, masterKey)).toBe(false);
  });

  it('rejeita token malformado', () => {
    const signer = createSigner();

    expect(signer.verify('', masterKey)).toBe(false);
    expect(signer.verify('semponto', masterKey)).toBe(false);
    expect(signer.verify('.abc', masterKey)).toBe(false);
  });
});
