import { describe, expect, it } from 'vitest';

import { MediaTokenSigner } from '#infra/media/media-token';

/**
 * Compatibilidade cruzada API ↔ Worker (ADR-007).
 *
 * A API assina o token com `node:crypto` (HMAC-SHA256); o Worker de produção
 * (`infra/media-gate/src/index.ts`) valida com Web Crypto. Uma divergência entre
 * as duas implementações quebraria a entrega em prod silenciosamente. Este teste
 * reimplementa a verificação do Worker com Web Crypto (global no Node) e prova que
 * ela aceita exatamente os tokens emitidos pela API.
 */

const secret = 'test-media-token-secret-at-least-32-chars';

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let binary = '';
  for (const byte of view) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Espelha isTokenValid() do Worker de prod.
async function workerVerify(
  token: string,
  objectKey: string,
  now: number,
): Promise<boolean> {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;

  const encoded = token.slice(0, separator);
  const providedSig = token.slice(separator + 1);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  const expectedSig = bytesToBase64Url(signature);

  if (expectedSig !== providedSig) return false;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as {
    p: string;
    e: number;
  };

  if (payload.e * 1000 <= now) return false;

  return objectKey === payload.p || objectKey.startsWith(`${payload.p}/`);
}

describe('media token — compatibilidade API (node:crypto) ↔ Worker (Web Crypto)', () => {
  const videoId = '00000000-0000-4000-8000-000000000001';
  const prefix = `videos/${videoId}`;
  const objectKey = `videos/${videoId}/hls/720p/segment_007.ts`;

  it('o Worker aceita um token válido emitido pela API', async () => {
    const token = new MediaTokenSigner(secret, 600).sign(prefix);

    await expect(workerVerify(token, objectKey, Date.now())).resolves.toBe(true);
  });

  it('o Worker rejeita um token expirado da API', async () => {
    const issuedAt = new Date('2026-07-09T00:00:00Z');
    const token = new MediaTokenSigner(secret, 600).sign(prefix, issuedAt);
    const afterExpiry = issuedAt.getTime() + 601 * 1000;

    await expect(workerVerify(token, objectKey, afterExpiry)).resolves.toBe(false);
  });

  it('o Worker rejeita objeto fora do prefixo', async () => {
    const token = new MediaTokenSigner(secret, 600).sign(prefix);
    const otherKey = 'videos/00000000-0000-4000-8000-000000000002/hls/master.m3u8';

    await expect(workerVerify(token, otherKey, Date.now())).resolves.toBe(false);
  });

  it('o Worker rejeita assinatura adulterada', async () => {
    const token = new MediaTokenSigner(secret, 600).sign(prefix);
    const [payload] = token.split('.');

    await expect(workerVerify(`${payload}.AAAA`, objectKey, Date.now())).resolves.toBe(false);
  });
});
