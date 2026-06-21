import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError } from '@playplus/shared';

import { canAccess } from '../domain/can-access.ts';

type RequiredRole = 'admin' | 'viewer';

export function requireRole(required: RequiredRole) {
  return async function checkRole(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!canAccess(required, request.user.role)) {
      throw new ForbiddenError();
    }
  };
}
