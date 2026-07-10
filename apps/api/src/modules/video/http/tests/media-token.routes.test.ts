import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLE, VideoNotFoundError } from '@playplus/shared';

const execute = vi.hoisted(() => vi.fn());

vi.mock('#config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-with-at-least-32-characters',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 604800,
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
    M2M_SERVICE_TOKEN: 'm2m-service-token-with-at-least-32-characters',
    DELEGATION_JWT_SECRET: 'delegation-secret-with-at-least-32-chars',
    DELEGATION_JWT_TTL_SECONDS: 60,
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_BUCKET: 'playplus',
    STORAGE_ACCESS_KEY: 'minioadmin',
    STORAGE_SECRET_KEY: 'minioadmin',
    STORAGE_REGION: 'us-east-1',
    CDN_BASE_URL: 'http://localhost:8080/media',
    PRESIGNED_UPLOAD_TTL_SECONDS: 3600,
    MEDIA_TOKEN_SECRET: 'test-media-token-secret-at-least-32-chars',
    MEDIA_TOKEN_TTL_SECONDS: 600,
  },
}));

vi.mock('#infra/database/client', () => ({ db: {} }));
vi.mock('#infra/storage/storage.factory', () => ({ createStorageClient: vi.fn() }));
vi.mock('#modules/video/infra/transcode.queue', () => ({ createTranscodeQueue: vi.fn(() => ({})) }));
vi.mock('#modules/video/infra/video.repository', () => ({ VideoRepository: vi.fn() }));

vi.mock('#modules/video/application/issue-media-token.query', () => ({
  IssueMediaTokenQuery: class MockIssueMediaTokenQuery {
    execute = execute;
  },
}));

const videoId = '00000000-0000-4000-8000-000000000001';

describe('GET /v1/videos/:id/media-token', () => {
  let app: ReturnType<typeof Fastify>;
  let viewerToken: string;

  beforeEach(async () => {
    execute.mockReset();

    const [{ default: errorHandlerPlugin }, { JwtService }, { default: videosRoutes }] =
      await Promise.all([
        import('#http/plugins/error-handler'),
        import('#modules/user/infra/jwt.service'),
        import('#modules/video/http/videos.routes'),
      ]);

    const jwtService = new JwtService({
      secret: 'test-secret-with-at-least-32-characters',
      accessTtlSeconds: 900,
    });
    viewerToken = jwtService.sign({ sub: 'viewer-id', role: USER_ROLE.VIEWER });

    app = Fastify();
    await app.register(cookie);
    await errorHandlerPlugin(app);
    await app.register(videosRoutes, { prefix: '/v1' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna 200 com token e expires_in para viewer autenticado', async () => {
    execute.mockResolvedValue({ token: 'signed.token' });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/videos/${videoId}/media-token`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ token: 'signed.token', expires_in: 600 });
    expect(execute).toHaveBeenCalledWith(videoId, { includeUnpublished: false });
  });

  it('retorna 401 sem autenticação', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/videos/${videoId}/media-token`,
    });

    expect(response.statusCode).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it('propaga 404 quando o vídeo não é visível', async () => {
    execute.mockRejectedValue(new VideoNotFoundError());

    const response = await app.inject({
      method: 'GET',
      url: `/v1/videos/${videoId}/media-token`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(response.statusCode).toBe(404);
  });
});
