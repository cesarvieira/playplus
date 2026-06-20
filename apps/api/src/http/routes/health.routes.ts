import type { FastifyInstance } from 'fastify';
import { HEALTH_CHECK_STATUS, HEALTH_STATUS, type HealthResponseDto } from '@playplus/shared';
import { pingDatabase } from '#infra/database/client';
import { pingValkey } from '#infra/valkey/client';

const healthResponseSchema = {
  type: 'object',
  required: ['status', 'timestamp', 'checks'],
  properties: {
    status: { type: 'string', enum: [HEALTH_STATUS.OK, HEALTH_STATUS.DEGRADED] },
    timestamp: { type: 'string', format: 'date-time' },
    checks: {
      type: 'object',
      required: ['database', 'valkey'],
      properties: {
        database: {
          type: 'string',
          enum: [HEALTH_CHECK_STATUS.OK, HEALTH_CHECK_STATUS.ERROR],
        },
        valkey: {
          type: 'string',
          enum: [HEALTH_CHECK_STATUS.OK, HEALTH_CHECK_STATUS.ERROR],
        },
      },
    },
  },
} as const;

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
          503: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const [databaseResult, valkeyResult] = await Promise.allSettled([
        pingDatabase(),
        pingValkey(),
      ]);

      const checks = {
        database:
          databaseResult.status === 'fulfilled'
            ? HEALTH_CHECK_STATUS.OK
            : HEALTH_CHECK_STATUS.ERROR,
        valkey:
          valkeyResult.status === 'fulfilled' ? HEALTH_CHECK_STATUS.OK : HEALTH_CHECK_STATUS.ERROR,
      };

      const isHealthy =
        checks.database === HEALTH_CHECK_STATUS.OK && checks.valkey === HEALTH_CHECK_STATUS.OK;

      const body: HealthResponseDto = {
        status: isHealthy ? HEALTH_STATUS.OK : HEALTH_STATUS.DEGRADED,
        timestamp: new Date().toISOString(),
        checks,
      };

      return reply.status(isHealthy ? 200 : 503).send(body);
    },
  );
}
