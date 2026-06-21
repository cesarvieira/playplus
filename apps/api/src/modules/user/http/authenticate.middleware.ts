import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@playplus/shared';

import type { JwtService } from '../infra/jwt.service.ts';

export function createAuthenticateMiddleware(jwtService: JwtService) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedError();
    }

    try {
      const payload = jwtService.verify(token);
      request.user = { id: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedError();
    }
  };
}
