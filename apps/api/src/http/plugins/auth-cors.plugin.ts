import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

import { isAllowedAdminOrigin } from '#http/cors-origins';

const AUTH_CORS_PATHS = ['/v1/auth/login', '/v1/auth/refresh', '/v1/auth/logout'] as const;

function isAuthCorsRoute(url: string): boolean {
  const path = url.split('?')[0];
  return AUTH_CORS_PATHS.includes(path as (typeof AUTH_CORS_PATHS)[number]);
}

function setAuthCorsHeaders(request: FastifyRequest, reply: FastifyReply): void {
  const origin = request.headers.origin;

  if (!isAllowedAdminOrigin(origin)) {
    return;
  }

  reply.header('Access-Control-Allow-Origin', origin);
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Vary', 'Origin');
}

export default async function authCorsPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(fastifyRateLimit, {
    global: false,
    max: 60,
    timeWindow: 60_000,
    keyGenerator: (request) => `${request.ip}:${request.url.split('?')[0]}`,
  });

  fastify.addHook('onRequest', async (request, reply) => {
    if (!isAuthCorsRoute(request.url)) {
      return;
    }

    await fastify.rateLimit()(request, reply);

    if (request.method === 'OPTIONS') {
      const origin = request.headers.origin;

      if (!isAllowedAdminOrigin(origin)) {
        return reply.status(403).send();
      }

      reply
        .header('Access-Control-Allow-Origin', origin)
        .header('Access-Control-Allow-Credentials', 'true')
        .header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        .header('Access-Control-Max-Age', '86400')
        .header('Vary', 'Origin')
        .status(204)
        .send();

      return;
    }

    setAuthCorsHeaders(request, reply);
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (!isAuthCorsRoute(request.url)) {
      return payload;
    }

    setAuthCorsHeaders(request, reply);
    return payload;
  });
}
