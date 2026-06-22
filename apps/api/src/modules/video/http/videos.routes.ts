import type { FastifyInstance } from 'fastify';

import { env } from '#config/env';
import { db } from '#infra/database/client';
import { createStorageClient } from '#infra/storage/storage.factory';
import { createAuthenticateMiddleware } from '#modules/user/http/authenticate.middleware';
import { requireRole } from '#modules/user/http/require-role.middleware';
import { JwtService } from '#modules/user/infra/jwt.service';

import { CreateVideoUseCase } from '../application/create-video.use-case.ts';
import { VideoRepository } from '../infra/video.repository.ts';
import {
  createVideoBodySchema,
  createVideoResponseSchema,
  errorResponseSchema,
  type CreateVideoRequestBody,
} from './videos.schemas.ts';

export default async function videosRoutes(fastify: FastifyInstance): Promise<void> {
  const jwtService = new JwtService({
    secret: env.JWT_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
  });
  const authenticate = createAuthenticateMiddleware(jwtService);
  const createVideoUseCase = new CreateVideoUseCase(new VideoRepository(db), createStorageClient());

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
}
