import type { FastifyInstance } from 'fastify';

import { db } from '#infra/database/client';

import { CreateCategoryUseCase } from '../application/create-category.use-case.ts';
import { ListCategoriesQuery } from '../application/list-categories.query.ts';
import { TaxonomyRepository } from '../infra/taxonomy.repository.ts';
import { createAuthMiddleware } from '#modules/user/http/create-auth.middleware';
import { requireRole } from '#modules/user/http/require-role.middleware';
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

  fastify.get(
    '/categories',
    {
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
