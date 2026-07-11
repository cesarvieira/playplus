import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

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

/**
 * CORS dedicado para as rotas de autenticação (login/refresh/logout), que
 * respondem fora do domínio do admin com credentials.
 *
 * O rate limit dessas rotas (60 req/min por IP) é configurado direto em
 * auth.routes.ts via `config.rateLimit`, usando o @fastify/rate-limit
 * registrado globalmente em server.ts — este plugin não registra um
 * limiter próprio. Antes havia dois registros do @fastify/rate-limit no
 * mesmo escopo raiz (aqui e em server.ts); foi consolidado num só para não
 * manter dois limiters concorrentes na mesma instância.
 */
export default async function authCorsPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    if (!isAuthCorsRoute(request.url)) {
      return;
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
