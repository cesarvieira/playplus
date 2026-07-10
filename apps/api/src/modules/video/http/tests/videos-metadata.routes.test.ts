import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE, VIDEO_STATUS } from '@playplus/shared';

const updateExecute = vi.hoisted(() => vi.fn());
const getExecute = vi.hoisted(() => vi.fn());

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

vi.mock('#modules/video/infra/video.repository', () => ({
  VideoRepository: vi.fn(),
}));

vi.mock('#modules/video/infra/taxonomy.repository', () => ({
  TaxonomyRepository: vi.fn(),
}));

vi.mock('#modules/video/application/update-video-metadata.use-case', () => ({
  UpdateVideoMetadataUseCase: class MockUpdateVideoMetadataUseCase {
    execute = updateExecute;
  },
}));

vi.mock('#modules/video/application/get-video.query', () => ({
  GetVideoQuery: class MockGetVideoQuery {
    execute = getExecute;
  },
}));

const videoId = '00000000-0000-4000-8000-000000000001';
const tagId = '00000000-0000-4000-8000-0000000000a1';

describe('PATCH /v1/videos/:id', () => {
  let app: ReturnType<typeof Fastify>;
  let adminToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    updateExecute.mockReset();
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

  it('retorna 401 sem token', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/videos/${videoId}`,
      payload: { description: 'x' },
    });

    expect(response.statusCode).toBe(401);
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('retorna 403 para viewer', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/videos/${videoId}`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { description: 'x' },
    });

    expect(response.statusCode).toBe(403);
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('retorna 200 com os metadados atualizados para admin', async () => {
    updateExecute.mockResolvedValue({ id: videoId });
    getExecute.mockResolvedValue({
      id: videoId,
      title: 'Meu filme',
      duration: 7240,
      thumbnailKey: null,
      thumbnailUrl: null,
      status: VIDEO_STATUS.READY,
      progress: null,
      description: 'Nova sinopse',
      tags: [{ id: tagId, name: 'Ação', slug: 'acao' }],
      publishedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/videos/${videoId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { description: 'Nova sinopse', tags: [{ id: tagId }] },
    });

    expect(response.statusCode).toBe(200);
    expect(updateExecute).toHaveBeenCalledWith(videoId, {
      description: 'Nova sinopse',
      tags: [{ id: tagId }],
    });
    const body = response.json();
    expect(body.description).toBe('Nova sinopse');
    expect(body.tags).toEqual([{ id: tagId, name: 'Ação', slug: 'acao' }]);
  });

  it('retorna 422 quando o use case rejeita id inexistente', async () => {
    const { ValidationError } = await import('@playplus/shared');
    updateExecute.mockRejectedValue(new ValidationError('Tag não encontrado'));

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/videos/${videoId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { tags: [{ id: tagId }] },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: { code: ERROR_CODE.VALIDATION_ERROR, message: expect.any(String) },
    });
    expect(getExecute).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o vídeo não existe', async () => {
    const { VideoNotFoundError } = await import('@playplus/shared');
    updateExecute.mockRejectedValue(new VideoNotFoundError());

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/videos/${videoId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { description: 'x' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: ERROR_CODE.VIDEO_NOT_FOUND, message: expect.any(String) },
    });
  });
});
