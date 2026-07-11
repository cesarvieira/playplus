import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE, VideoNotFoundError } from '@playplus/shared';

const deleteExecute = vi.hoisted(() => vi.fn());

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
    MEDIA_TOKEN_SECRET: 'test-media-token-secret-at-least-32-chars',
    MEDIA_TOKEN_TTL_SECONDS: 600,
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
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/application/get-video.query', () => ({
  GetVideoQuery: class MockGetVideoQuery {
    execute = vi.fn();
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

vi.mock('#modules/video/application/publish-video.use-case', () => ({
  PublishVideoUseCase: class MockPublishVideoUseCase {
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/application/schedule-video.use-case', () => ({
  ScheduleVideoUseCase: class MockScheduleVideoUseCase {
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/application/unpublish-video.use-case', () => ({
  UnpublishVideoUseCase: class MockUnpublishVideoUseCase {
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/application/delete-video.use-case', () => ({
  DeleteVideoUseCase: class MockDeleteVideoUseCase {
    execute = deleteExecute;
  },
}));

vi.mock('#modules/video/infra/video.repository', () => ({
  VideoRepository: vi.fn(),
}));

const videoId = '00000000-0000-4000-8000-000000000001';

describe('DELETE /v1/videos/:id', () => {
  let app: ReturnType<typeof Fastify>;
  let adminToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    deleteExecute.mockReset();

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

  it('retorna 204 para admin', async () => {
    deleteExecute.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/videos/${videoId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(deleteExecute).toHaveBeenCalledWith(videoId);
  });

  it('retorna 401 sem token', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/videos/${videoId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('retorna 403 para viewer', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/videos/${videoId}`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: { code: ERROR_CODE.FORBIDDEN, message: expect.any(String) },
    });
  });

  it('retorna 404 quando vídeo não existe', async () => {
    deleteExecute.mockRejectedValue(new VideoNotFoundError());

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/videos/${videoId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(404);
  });
});
