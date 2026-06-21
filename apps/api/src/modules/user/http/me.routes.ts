import type { FastifyInstance } from 'fastify';

import { env } from '#config/env';
import { db } from '#infra/database/client';

import { GetMeUseCase } from '../application/get-me.use-case.ts';
import { JwtService } from '../infra/jwt.service.ts';
import { UserRepository } from '../infra/user.repository.ts';
import { createAuthenticateMiddleware } from './authenticate.middleware.ts';
import { meResponseSchema, errorResponseSchema } from './me.schemas.ts';

export default async function meRoutes(fastify: FastifyInstance): Promise<void> {
  const jwtService = new JwtService({
    secret: env.JWT_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
  });
  const getMeUseCase = new GetMeUseCase(new UserRepository(db));
  const authenticate = createAuthenticateMiddleware(jwtService);

  fastify.get(
    '/me',
    {
      schema: {
        response: {
          200: meResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = await getMeUseCase.execute({ userId: request.user.id });

      return reply.status(200).send({
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.createdAt,
      });
    },
  );
}
