import { env } from '#config/env';
import { db } from '#infra/database/client';

import { DelegationJwtService } from '../infra/delegation-jwt.service.ts';
import { JwtService } from '../infra/jwt.service.ts';
import { UserRepository } from '../infra/user.repository.ts';
import { createAuthenticateMiddleware } from './authenticate.middleware.ts';

export function createAuthMiddleware() {
  const jwtService = new JwtService({
    secret: env.JWT_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
  });
  const delegationJwtService = new DelegationJwtService({
    secret: env.DELEGATION_JWT_SECRET,
    ttlSeconds: env.DELEGATION_JWT_TTL_SECONDS,
  });
  const userRepository = new UserRepository(db);

  return createAuthenticateMiddleware({
    jwtService,
    delegationJwtService,
    m2mServiceToken: env.M2M_SERVICE_TOKEN,
    userRepository,
  });
}
