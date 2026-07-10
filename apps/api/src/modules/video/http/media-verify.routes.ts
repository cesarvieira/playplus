import type { FastifyInstance } from 'fastify';

import { env } from '#config/env';
import { createMediaTokenSigner } from '#infra/media/media-token.factory';

import { authorizeMediaRequest } from './media-authorization.ts';

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
