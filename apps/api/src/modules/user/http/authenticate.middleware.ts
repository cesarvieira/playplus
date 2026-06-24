import { createHash, timingSafeEqual } from 'node:crypto';

import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@playplus/shared';

import type { DelegationJwtService } from '../infra/delegation-jwt.service.ts';
import type { JwtService } from '../infra/jwt.service.ts';
import type { UserRepository } from '../infra/user.repository.ts';

const M2M_USER_ID_HEADER = 'x-user-id';

interface AuthenticateMiddlewareOptions {
  jwtService: JwtService;
  delegationJwtService: DelegationJwtService;
  m2mServiceToken: string;
  userRepository: UserRepository;
}

function digestEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

export function createAuthenticateMiddleware(options: AuthenticateMiddlewareOptions) {
  const { jwtService, delegationJwtService, m2mServiceToken, userRepository } = options;

  async function authenticateWithM2m(
    request: FastifyRequest,
    bearerToken: string,
  ): Promise<boolean> {
    if (!digestEqual(bearerToken, m2mServiceToken)) {
      return false;
    }

    const delegationToken = request.headers[M2M_USER_ID_HEADER];

    if (typeof delegationToken !== 'string' || !delegationToken.trim()) {
      throw new UnauthorizedError();
    }

    try {
      const payload = delegationJwtService.verify(delegationToken.trim());
      const user = await userRepository.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedError();
      }

      request.user = { id: user.id, role: user.role };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new UnauthorizedError();
    }
  }

  async function authenticateWithUserJwt(
    bearerToken: string,
    request: FastifyRequest,
  ): Promise<void> {
    try {
      const payload = jwtService.verify(bearerToken);
      request.user = { id: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedError();
    }
  }

  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const bearerToken = extractBearerToken(request.headers.authorization);

    if (!bearerToken) {
      throw new UnauthorizedError();
    }

    const authenticatedViaM2m = await authenticateWithM2m(request, bearerToken);

    if (authenticatedViaM2m) {
      return;
    }

    await authenticateWithUserJwt(bearerToken, request);
  };
}
