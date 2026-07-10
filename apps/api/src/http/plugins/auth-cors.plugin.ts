import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { isAllowedAdminOrigin } from '#http/cors-origins';

const AUTH_CORS_PATHS = ['/v1/auth/login', '/v1/auth/refresh', '/v1/auth/logout'] as const;
const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 60;
const authRateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isAuthCorsRoute(url: string): boolean {
  const path = url.split('?')[0];
  return AUTH_CORS_PATHS.includes(path as (typeof AUTH_CORS_PATHS)[number]);
}

function isAuthRateLimited(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0];
  const key = `${request.ip}:${path}`;
  const now = Date.now();
  const current = authRateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    authRateLimitStore.set(key, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  authRateLimitStore.set(key, current);

  return current.count > AUTH_RATE_LIMIT_MAX_REQUESTS;
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
  fastify.addHook('onRequest', async (request, reply) => {
    if (!isAuthCorsRoute(request.url)) {
      return;
    }

    if (isAuthRateLimited(request)) {
      return reply.status(429).send();
    }

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
