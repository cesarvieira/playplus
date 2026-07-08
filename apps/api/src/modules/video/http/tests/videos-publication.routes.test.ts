import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE, ValidationError, VideoNotFoundError } from '@playplus/shared';

const listExecute = vi.hoisted(() => vi.fn());
const getExecute = vi.hoisted(() => vi.fn());
const publishExecute = vi.hoisted(() => vi.fn());
const scheduleExecute = vi.hoisted(() => vi.fn());
const unpublishExecute = vi.hoisted(() => vi.fn());

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

vi.mock('#modules/video/application/publish-video.use-case', () => ({
  PublishVideoUseCase: class MockPublishVideoUseCase {
    execute = publishExecute;
  },
}));

vi.mock('#modules/video/application/schedule-video.use-case', () => ({
  ScheduleVideoUseCase: class MockScheduleVideoUseCase {
    execute = scheduleExecute;
  },
}));

vi.mock('#modules/video/application/unpublish-video.use-case', () => ({
  UnpublishVideoUseCase: class MockUnpublishVideoUseCase {
    execute = unpublishExecute;
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

describe('Publicação — rotas de vídeo', () => {
  let app: ReturnType<typeof Fastify>;
  let adminToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    listExecute.mockReset();
    getExecute.mockReset();
    publishExecute.mockReset();
    scheduleExecute.mockReset();
    unpublishExecute.mockReset();

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

  describe('GET /v1/videos — filtro por role', () => {
    it('passa includeUnpublished false para viewer', async () => {
      listExecute.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });

      await app.inject({
        method: 'GET',
        url: '/v1/videos',
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(listExecute).toHaveBeenCalledWith(
        expect.objectContaining({ includeUnpublished: false }),
      );
    });

    it('passa includeUnpublished false para admin sem query param', async () => {
      listExecute.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });

      await app.inject({
        method: 'GET',
        url: '/v1/videos',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(listExecute).toHaveBeenCalledWith(
        expect.objectContaining({ includeUnpublished: false }),
      );
    });

    it('passa includeUnpublished true para admin com include_unpublished', async () => {
      listExecute.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });

      await app.inject({
        method: 'GET',
        url: '/v1/videos?include_unpublished=true',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(listExecute).toHaveBeenCalledWith(
        expect.objectContaining({ includeUnpublished: true }),
      );
    });

    it('ignora include_unpublished para viewer', async () => {
      listExecute.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });

      await app.inject({
        method: 'GET',
        url: '/v1/videos?include_unpublished=true',
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(listExecute).toHaveBeenCalledWith(
        expect.objectContaining({ includeUnpublished: false }),
      );
    });
  });

  describe('GET /v1/videos/:id — filtro por role', () => {
    it('passa includeUnpublished false para viewer', async () => {
      getExecute.mockResolvedValue({
        id: videoId,
        title: 'Meu filme',
        duration: 7240,
        thumbnailUrl: null,
        status: 'ready',
        progress: null,
        publishedAt: '2025-01-01T00:00:00Z',
        createdAt: '2025-01-01T00:00:00Z',
      });

      await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(getExecute).toHaveBeenCalledWith(videoId, { includeUnpublished: false });
    });

    it('passa includeUnpublished true para admin com include_unpublished', async () => {
      getExecute.mockResolvedValue({
        id: videoId,
        title: 'Meu filme',
        duration: null,
        thumbnailUrl: null,
        status: 'processing',
        progress: null,
        publishedAt: null,
        createdAt: '2025-01-01T00:00:00Z',
      });

      await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}?include_unpublished=true`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(getExecute).toHaveBeenCalledWith(videoId, { includeUnpublished: true });
    });

    it('passa includeUnpublished false para admin sem query param', async () => {
      getExecute.mockResolvedValue({
        id: videoId,
        title: 'Meu filme',
        duration: 7240,
        thumbnailUrl: null,
        status: 'ready',
        progress: null,
        publishedAt: '2025-01-01T00:00:00Z',
        createdAt: '2025-01-01T00:00:00Z',
      });

      await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(getExecute).toHaveBeenCalledWith(videoId, { includeUnpublished: false });
    });
  });

  describe('PATCH /v1/videos/:id/publish', () => {
    it('retorna 200 para admin', async () => {
      publishExecute.mockResolvedValue({
        id: videoId,
        publishedAt: '2026-07-04T12:00:00.000Z',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/publish`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: videoId,
        published_at: '2026-07-04T12:00:00.000Z',
      });
      expect(publishExecute).toHaveBeenCalledWith(videoId);
    });

    it('retorna 401 sem token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/publish`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('retorna 403 para viewer', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/publish`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: { code: ERROR_CODE.FORBIDDEN, message: expect.any(String) },
      });
    });

    it('retorna 404 quando vídeo não existe', async () => {
      publishExecute.mockRejectedValue(new VideoNotFoundError());

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/publish`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /v1/videos/:id/schedule', () => {
    it('retorna 200 para admin com data futura', async () => {
      scheduleExecute.mockResolvedValue({
        id: videoId,
        publishedAt: '2030-01-01T00:00:00.000Z',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { published_at: '2030-01-01T00:00:00.000Z' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: videoId,
        published_at: '2030-01-01T00:00:00.000Z',
      });
      expect(scheduleExecute).toHaveBeenCalledWith(videoId, new Date('2030-01-01T00:00:00.000Z'));
    });

    it('retorna 422 para data passada', async () => {
      scheduleExecute.mockRejectedValue(new ValidationError('published_at deve ser uma data futura'));

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { published_at: '2020-01-01T00:00:00.000Z' },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({
        error: { code: ERROR_CODE.VALIDATION_ERROR, message: expect.any(String) },
      });
    });

    it('retorna 403 para viewer', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/schedule`,
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { published_at: '2030-01-01T00:00:00.000Z' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PATCH /v1/videos/:id/unpublish', () => {
    it('retorna 200 para admin', async () => {
      unpublishExecute.mockResolvedValue({ id: videoId, publishedAt: null });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/unpublish`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: videoId, published_at: null });
      expect(unpublishExecute).toHaveBeenCalledWith(videoId);
    });

    it('retorna 403 para viewer', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/unpublish`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
