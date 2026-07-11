import type { FastifyInstance } from 'fastify';

import { env } from '#config/env';
import { db } from '#infra/database/client';
import { createUserAwareKeyGenerator } from '#http/rate-limit-key';
import { RATE_LIMIT_READ, RATE_LIMIT_SENSITIVE_WRITE } from '#http/rate-limit-presets';

import { CreateCategoryUseCase } from '../application/create-category.use-case.ts';
import { ListCategoriesQuery } from '../application/list-categories.query.ts';
import { TaxonomyRepository } from '../infra/taxonomy.repository.ts';
import { createAuthMiddleware } from '#modules/user/http/create-auth.middleware';
import { requireRole } from '#modules/user/http/require-role.middleware';
import { JwtService } from '#modules/user/infra/jwt.service';
import {
  createCategoryBodySchema,
  createCategoryResponseSchema,
  errorResponseSchema,
  listCategoriesResponseSchema,
  type CreateCategoryRequestBody,
} from './categories.schemas.ts';

export default async function categoriesRoutes(fastify: FastifyInstance): Promise<void> {
  const taxonomyRepository = new TaxonomyRepository(db);
  const listCategoriesQuery = new ListCategoriesQuery(taxonomyRepository);
  const createCategoryUseCase = new CreateCategoryUseCase(taxonomyRepository);
  const authenticate = createAuthMiddleware();
  const jwtService = new JwtService({
    secret: env.JWT_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
  });
  const keyGenerator = createUserAwareKeyGenerator(jwtService);

  fastify.get(
    '/categories',
    {
      config: { rateLimit: { ...RATE_LIMIT_READ, keyGenerator } },
      schema: {
        response: {
          200: listCategoriesResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate],
    },
    async (_request, reply) => {
      const result = await listCategoriesQuery.execute();
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    '/categories',
    {
      config: { rateLimit: { ...RATE_LIMIT_SENSITIVE_WRITE, keyGenerator } },
      schema: {
        body: createCategoryBodySchema,
        response: {
          201: createCategoryResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const body = request.body as CreateCategoryRequestBody;
      const category = await createCategoryUseCase.execute(body);
      return reply.status(201).send(category);
    },
  );
}
