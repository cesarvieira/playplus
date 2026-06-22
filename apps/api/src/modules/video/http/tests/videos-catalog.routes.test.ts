import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE, VIDEO_STATUS } from '@playplus/shared';

const listExecute = vi.hoisted(() => vi.fn());
const getExecute = vi.hoisted(() => vi.fn());

vi.mock('#config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-with-at-least-32-characters',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 604800,
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
    CDN_BASE_URL: 'http://localhost:8080/media',
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_BUCKET: 'playplus',
    STORAGE_ACCESS_KEY: 'minioadmin',
    STORAGE_SECRET_KEY: 'minioadmin',
    STORAGE_REGION: 'us-east-1',
    PRESIGNED_UPLOAD_TTL_SECONDS: 3600,
  },
}));

vi.mock('#infra/database/client', () => ({
  db: {},
}));

vi.mock('#infra/storage/storage.factory', () => ({
  createStorageClient: vi.fn(),
}));

vi.mock('#modules/video/infra/transcode.queue', () => ({
  createTranscodeQueue: vi.fn(() => ({})),
}));

vi.mock('#modules/video/application/list-videos.query', () => ({
  ListVideosQuery: class MockListVideosQuery {
    execute = listExecute;
  },
}));

vi.mock('#modules/video/application/get-video.query', () => ({
  GetVideoQuery: class MockGetVideoQuery {
    execute = getExecute;
  },
}));

vi.mock('#modules/video/application/create-video.use-case', () => ({
  CreateVideoUseCase: class MockCreateVideoUseCase {
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/application/renew-upload-url.use-case', () => ({
  RenewUploadUrlUseCase: class MockRenewUploadUrlUseCase {
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/application/enqueue-transcode.use-case', () => ({
  EnqueueTranscodeUseCase: class MockEnqueueTranscodeUseCase {
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/infra/video.repository', () => ({
  VideoRepository: vi.fn(),
}));

const videoId = '00000000-0000-4000-8000-000000000001';

describe('GET /v1/videos e GET /v1/videos/:id', () => {
  let app: ReturnType<typeof Fastify>;
  let adminToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    listExecute.mockReset();
    getExecute.mockReset();

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
    adminToken = jwtService.sign({ sub: 'admin-id', role: USER_ROLE.ADMIN });
    viewerToken = jwtService.sign({ sub: 'viewer-id', role: USER_ROLE.VIEWER });

    app = Fastify();
    await app.register(cookie);
    await errorHandlerPlugin(app);
    await app.register(videosRoutes, { prefix: '/v1' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /v1/videos', () => {
    it('retorna 401 sem token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/videos',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: { code: ERROR_CODE.UNAUTHORIZED, message: expect.any(String) },
      });
    });

    it('retorna 200 paginado para viewer', async () => {
      listExecute.mockResolvedValue({
        data: [
          {
            id: videoId,
            title: 'Meu filme',
            duration: 7240,
            thumbnailUrl: null,
            status: VIDEO_STATUS.READY,
            createdAt: '2025-01-01T00:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 20 },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/videos?page=1&limit=20',
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        data: [
          {
            id: videoId,
            title: 'Meu filme',
            duration: 7240,
            thumbnail_url: null,
            status: VIDEO_STATUS.READY,
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 20 },
      });
    });

    it('retorna 200 para admin', async () => {
      listExecute.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20 },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/videos',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /v1/videos/:id', () => {
    it('retorna 401 sem token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('retorna 200 com stream_url para vídeo ready', async () => {
      getExecute.mockResolvedValue({
        id: videoId,
        title: 'Meu filme',
        duration: 7240,
        thumbnailUrl: null,
        streamUrl: `http://localhost:8080/media/videos/${videoId}/hls/master.m3u8`,
        status: VIDEO_STATUS.READY,
        progress: null,
        createdAt: '2025-01-01T00:00:00Z',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: videoId,
        title: 'Meu filme',
        duration: 7240,
        thumbnail_url: null,
        stream_url: `http://localhost:8080/media/videos/${videoId}/hls/master.m3u8`,
        status: VIDEO_STATUS.READY,
        progress: null,
        created_at: '2025-01-01T00:00:00Z',
      });
    });

    it('retorna 200 sem stream_url para vídeo processing', async () => {
      getExecute.mockResolvedValue({
        id: videoId,
        title: 'Meu filme',
        duration: null,
        thumbnailUrl: null,
        status: VIDEO_STATUS.PROCESSING,
        progress: null,
        createdAt: '2025-01-01T00:00:00Z',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).not.toHaveProperty('stream_url');
      expect(body.status).toBe(VIDEO_STATUS.PROCESSING);
    });

    it('retorna 404 quando vídeo não existe', async () => {
      const { VideoNotFoundError } = await import('@playplus/shared');
      getExecute.mockRejectedValue(new VideoNotFoundError());

      const response = await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: ERROR_CODE.VIDEO_NOT_FOUND, message: expect.any(String) },
      });
    });
  });
});
