import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE, VIDEO_STATUS } from '@playplus/shared';

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

vi.mock('#modules/video/application/create-video.use-case', () => ({
  CreateVideoUseCase: class MockCreateVideoUseCase {
    execute = execute;
  },
}));

vi.mock('#modules/video/infra/video.repository', () => ({
  VideoRepository: vi.fn(),
}));

describe('POST /v1/videos', () => {
  let app: ReturnType<typeof Fastify>;
  let adminToken: string;
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

  const validPayload = {
    title: 'Meu filme',
    file_name: 'movie.mp4',
    file_size: 4294967296,
  };

  it('retorna 201 com id, upload_url e status pending para admin', async () => {
    execute.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      uploadUrl: 'https://storage/presigned-url',
      status: VIDEO_STATUS.PENDING,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/videos',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      upload_url: 'https://storage/presigned-url',
      status: VIDEO_STATUS.PENDING,
    });
    expect(execute).toHaveBeenCalledWith({
      title: 'Meu filme',
      fileName: 'movie.mp4',
      fileSize: 4294967296,
    });
  });

  it('retorna 401 UNAUTHORIZED sem Bearer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/videos',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.UNAUTHORIZED,
        message: 'Não autorizado',
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('retorna 403 FORBIDDEN para viewer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/videos',
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: validPayload,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.FORBIDDEN,
        message: 'Acesso negado',
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('retorna 422 quando title está vazio', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/videos',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        ...validPayload,
        title: '',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.VALIDATION_ERROR,
        message: expect.any(String),
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('retorna 422 quando file_size é menor que 1', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/videos',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        ...validPayload,
        file_size: 0,
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.VALIDATION_ERROR,
        message: expect.any(String),
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
