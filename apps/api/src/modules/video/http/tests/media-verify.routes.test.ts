import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const secret = 'test-media-token-secret-at-least-32-chars';
const bucket = 'playplus';

vi.mock('#config/env', () => ({
  env: {
    MEDIA_TOKEN_SECRET: secret,
    MEDIA_TOKEN_TTL_SECONDS: 600,
    STORAGE_BUCKET: bucket,
  },
}));

const videoId = '00000000-0000-4000-8000-000000000001';
const objectKey = `videos/${videoId}/hls/master.m3u8`;

async function buildApp() {
  const [{ default: mediaVerifyRoutes }, { MediaTokenSigner }] = await Promise.all([
    import('#modules/video/http/media-verify.routes'),
    import('#infra/media/media-token'),
  ]);

  const app = Fastify();
  await app.register(mediaVerifyRoutes, { prefix: '/v1' });
  await app.ready();

  const signer = new MediaTokenSigner(secret, 600);

  return { app, signer };
}

describe('GET /v1/media/verify (gate forward_auth)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>['app'];
  let token: string;

  beforeEach(async () => {
    const built = await buildApp();
    app = built.app;
    token = built.signer.sign(`videos/${videoId}`);
  });

  it('retorna 204 para GET com token válido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/media/verify',
      headers: {
        'x-forwarded-method': 'GET',
        'x-forwarded-uri': `/${bucket}/${objectKey}?t=${token}`,
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it('retorna 403 sem token (scanner/hotlink)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/media/verify',
      headers: {
        'x-forwarded-method': 'GET',
        'x-forwarded-uri': `/${bucket}/${objectKey}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 403 quando X-Forwarded-Uri está ausente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/media/verify',
      headers: { 'x-forwarded-method': 'GET' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 403 para token de outro vídeo', async () => {
    const otherKey = 'videos/00000000-0000-4000-8000-000000000002/hls/master.m3u8';
    const response = await app.inject({
      method: 'GET',
      url: '/v1/media/verify',
      headers: {
        'x-forwarded-method': 'GET',
        'x-forwarded-uri': `/${bucket}/${otherKey}?t=${token}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
