import type { FastifyInstance, FastifyRequest } from 'fastify';

import { env } from '#config/env';
import { createMediaTokenSigner } from '#infra/media/media-token.factory';

import { authorizeMediaRequest } from './media-authorization.ts';

/**
 * Chave de rate limit = IP real do cliente. Como este endpoint é alvo do
 * `forward_auth` do Caddy, o peer direto (`request.ip`) é sempre o proxy — usá-lo
 * limitaria TODOS os clientes juntos. O cliente real vem no `X-Forwarded-For`
 * definido pelo Caddy; cai para `request.ip` em acesso direto.
 */
function clientIpKey(request: FastifyRequest): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split(',')[0]?.trim() || request.ip;
  }

  return request.ip;
}

/**
 * Endpoint interno do gate de mídia (ADR-007). Alvo do `forward_auth` do Caddy:
 * valida o token da requisição original e responde 204 (libera) ou 403 (nega),
 * sem servir bytes — o proxy para o MinIO é feito pelo próprio Caddy.
 */
export default async function mediaVerifyRoutes(fastify: FastifyInstance): Promise<void> {
  const signer = createMediaTokenSigner();

  fastify.route({
    method: ['GET', 'HEAD'],
    url: '/media/verify',
    config: {
      // Teto generoso: este endpoint é consultado a cada segmento HLS (playlist +
      // .ts × renditions), então o limite precisa acomodar reprodução normal
      // (inclui bursts de buffering/seek) e ainda barrar flood. ~10 req/s por IP.
      rateLimit: {
        max: 600,
        timeWindow: '1 minute',
        keyGenerator: clientIpKey,
      },
    },
    handler: async (request, reply) => {
      const method =
        (request.headers['x-forwarded-method'] as string | undefined) ?? request.method;
      const uri = request.headers['x-forwarded-uri'] as string | undefined;

      if (!uri) {
        return reply.status(403).send();
      }

      const authorized = authorizeMediaRequest(signer, {
        method,
        uri,
        bucket: env.STORAGE_BUCKET,
      });

      return reply.status(authorized ? 204 : 403).send();
    },
  });
}
