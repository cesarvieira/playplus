import type { FastifyInstance } from 'fastify';

import { env } from '#config/env';
import { db } from '#infra/database/client';
import { createStorageClient } from '#infra/storage/storage.factory';
import { createAuthenticateMiddleware } from '#modules/user/http/authenticate.middleware';
import { requireRole } from '#modules/user/http/require-role.middleware';
import { JwtService } from '#modules/user/infra/jwt.service';

import { CreateVideoUseCase } from '../application/create-video.use-case.ts';
import { EnqueueTranscodeUseCase } from '../application/enqueue-transcode.use-case.ts';
import { RenewUploadUrlUseCase } from '../application/renew-upload-url.use-case.ts';
import { createTranscodeQueue } from '../infra/transcode.queue.ts';
import { VideoRepository } from '../infra/video.repository.ts';
import {
  createVideoBodySchema,
  createVideoResponseSchema,
  enqueueTranscodeResponseSchema,
  errorResponseSchema,
  renewUploadUrlResponseSchema,
  type CreateVideoRequestBody,
  videoIdParamsSchema,
} from './videos.schemas.ts';

export default async function videosRoutes(fastify: FastifyInstance): Promise<void> {
  const jwtService = new JwtService({
    secret: env.JWT_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
  });
  const authenticate = createAuthenticateMiddleware(jwtService);
  const videoRepository = new VideoRepository(db);
  const storageClient = createStorageClient();
  const transcodeQueue = createTranscodeQueue();
  const createVideoUseCase = new CreateVideoUseCase(videoRepository, storageClient);
  const renewUploadUrlUseCase = new RenewUploadUrlUseCase(videoRepository, storageClient);
  const enqueueTranscodeUseCase = new EnqueueTranscodeUseCase(
    videoRepository,
    storageClient,
    transcodeQueue,
  );

  fastify.post(
    '/videos',
    {
      schema: {
        body: createVideoBodySchema,
        response: {
          201: createVideoResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const body = request.body as CreateVideoRequestBody;
      const result = await createVideoUseCase.execute({
        title: body.title,
        fileName: body.file_name,
        fileSize: body.file_size,
      });

      return reply.status(201).send({
        id: result.id,
        upload_url: result.uploadUrl,
        status: result.status,
      });
    },
  );

  fastify.post(
    '/videos/:id/upload-url',
    {
      schema: {
        params: videoIdParamsSchema,
        response: {
          200: renewUploadUrlResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await renewUploadUrlUseCase.execute(id);

      return reply.status(200).send({
        id: result.id,
        upload_url: result.uploadUrl,
        status: result.status,
      });
    },
  );

  fastify.post(
    '/videos/:id/transcode',
    {
      schema: {
        params: videoIdParamsSchema,
        response: {
          202: enqueueTranscodeResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await enqueueTranscodeUseCase.execute(id);

      return reply.status(202).send({
        job_id: result.jobId,
        status: result.status,
      });
    },
  );
}
