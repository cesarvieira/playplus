import type { FastifyInstance } from 'fastify';

import { db } from '#infra/database/client';

import { GetMeUseCase } from '../application/get-me.use-case.ts';
import { UserRepository } from '../infra/user.repository.ts';
import { createAuthMiddleware } from './create-auth.middleware.ts';
import { meResponseSchema, errorResponseSchema } from './me.schemas.ts';

export default async function meRoutes(fastify: FastifyInstance): Promise<void> {
  const getMeUseCase = new GetMeUseCase(new UserRepository(db));
  const authenticate = createAuthMiddleware();

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
