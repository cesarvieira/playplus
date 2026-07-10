import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE, VIDEO_STATUS, buildTranscodeJobId } from '@playplus/shared';

const renewExecute = vi.hoisted(() => vi.fn());
const enqueueExecute = vi.hoisted(() => vi.fn());

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

vi.mock('#modules/video/application/renew-upload-url.use-case', () => ({
  RenewUploadUrlUseCase: class MockRenewUploadUrlUseCase {
    execute = renewExecute;
  },
}));

vi.mock('#modules/video/application/enqueue-transcode.use-case', () => ({
  EnqueueTranscodeUseCase: class MockEnqueueTranscodeUseCase {
    execute = enqueueExecute;
  },
}));

vi.mock('#modules/video/application/create-video.use-case', () => ({
  CreateVideoUseCase: class MockCreateVideoUseCase {
    execute = vi.fn();
  },
}));

vi.mock('#modules/video/infra/video.repository', () => ({
  VideoRepository: vi.fn(),
}));

const videoId = '00000000-0000-4000-8000-000000000001';

describe('POST /v1/videos/:id/upload-url e /transcode', () => {
  let app: ReturnType<typeof Fastify>;
  let adminToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    renewExecute.mockReset();
    enqueueExecute.mockReset();

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

  describe('POST /v1/videos/:id/upload-url', () => {
    it('retorna 200 com nova upload_url para admin', async () => {
      renewExecute.mockResolvedValue({
        id: videoId,
        uploadUrl: 'https://storage/new-presigned-url',
        status: VIDEO_STATUS.PENDING,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/upload-url`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: videoId,
        upload_url: 'https://storage/new-presigned-url',
        status: VIDEO_STATUS.PENDING,
      });
      expect(renewExecute).toHaveBeenCalledWith(videoId);
    });

    it('retorna 401 UNAUTHORIZED sem Bearer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/upload-url`,
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: {
          code: ERROR_CODE.UNAUTHORIZED,
          message: 'Não autorizado',
        },
      });
      expect(renewExecute).not.toHaveBeenCalled();
    });

    it('retorna 403 FORBIDDEN para viewer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/upload-url`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          code: ERROR_CODE.FORBIDDEN,
          message: 'Acesso negado',
        },
      });
      expect(renewExecute).not.toHaveBeenCalled();
    });

    it('propaga 409 VIDEO_NOT_READY para status inválido', async () => {
      const { InvalidVideoStatusError } =
        await import('../../domain/invalid-video-status.error.ts');
      renewExecute.mockRejectedValue(new InvalidVideoStatusError('Vídeo não está pending'));

      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/upload-url`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: {
          code: ERROR_CODE.VIDEO_NOT_READY,
          message: 'Vídeo não está pending',
        },
      });
    });
  });

  describe('POST /v1/videos/:id/transcode', () => {
    it('retorna 202 com job_id e status queued para admin', async () => {
      const jobId = buildTranscodeJobId(videoId);
      enqueueExecute.mockResolvedValue({
        jobId,
        status: VIDEO_STATUS.QUEUED,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/transcode`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toEqual({
        job_id: jobId,
        status: VIDEO_STATUS.QUEUED,
      });
      expect(enqueueExecute).toHaveBeenCalledWith(videoId);
    });

    it('retorna 401 UNAUTHORIZED sem Bearer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/transcode`,
      });

      expect(response.statusCode).toBe(401);
      expect(enqueueExecute).not.toHaveBeenCalled();
    });

    it('retorna 403 FORBIDDEN para viewer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/transcode`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(enqueueExecute).not.toHaveBeenCalled();
    });

    it('propaga 422 VALIDATION_ERROR quando upload não concluído', async () => {
      const { ValidationError } = await import('@playplus/shared');
      enqueueExecute.mockRejectedValue(new ValidationError('Upload não concluído'));

      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/transcode`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({
        error: {
          code: ERROR_CODE.VALIDATION_ERROR,
          message: 'Upload não concluído',
        },
      });
    });

    it('propaga 409 JOB_ALREADY_QUEUED para job duplicado', async () => {
      const { JobAlreadyQueuedError } = await import('../../domain/job-already-queued.error.ts');
      enqueueExecute.mockRejectedValue(new JobAlreadyQueuedError());

      const response = await app.inject({
        method: 'POST',
        url: `/v1/videos/${videoId}/transcode`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: {
          code: ERROR_CODE.JOB_ALREADY_QUEUED,
          message: 'Job de transcodificação já enfileirado',
        },
      });
    });
  });
});
