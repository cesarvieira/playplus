import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE } from '@playplus/shared';

import { DelegationJwtService } from '#modules/user/infra/delegation-jwt.service';
import { JwtService } from '#modules/user/infra/jwt.service';
import type { UserRepository } from '#modules/user/infra/user.repository';
import { createAuthenticateMiddleware } from '../authenticate.middleware.ts';
import { requireRole } from '../require-role.middleware.ts';

const JWT_SECRET = 'test-secret-with-at-least-32-characters';
const M2M_TOKEN = 'm2m-service-token-with-at-least-32-characters';
const DELEGATION_SECRET = 'delegation-secret-with-at-least-32-chars';

function createAuthMiddlewareForTests(jwtService: JwtService) {
  const delegationJwtService = new DelegationJwtService({
    secret: DELEGATION_SECRET,
    ttlSeconds: 60,
  });
  const userRepository = {
    findById: vi.fn(),
  } as unknown as UserRepository;

  return createAuthenticateMiddleware({
    jwtService,
    delegationJwtService,
    m2mServiceToken: M2M_TOKEN,
    userRepository,
  });
}

describe('requireRole', () => {
  let app: ReturnType<typeof Fastify>;
  let jwtService: JwtService;

  beforeEach(async () => {
    jwtService = new JwtService({ secret: JWT_SECRET, accessTtlSeconds: 900 });
    const authenticate = createAuthMiddlewareForTests(jwtService);

    const { default: errorHandlerPlugin } =
      await import('../../../../http/plugins/error-handler.ts');

    app = Fastify();
    await errorHandlerPlugin(app);

    app.get(
      '/admin-only',
      {
        preHandler: [authenticate, requireRole('admin')],
      },
      async () => ({ ok: true }),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('autoriza admin', async () => {
    const token = jwtService.sign({ sub: 'admin-id', role: USER_ROLE.ADMIN });

    const response = await app.inject({
      method: 'GET',
      url: '/admin-only',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('retorna 403 FORBIDDEN para viewer', async () => {
    const token = jwtService.sign({ sub: 'viewer-id', role: USER_ROLE.VIEWER });

    const response = await app.inject({
      method: 'GET',
      url: '/admin-only',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.FORBIDDEN,
        message: 'Acesso negado',
      },
    });
  });

  it('autoriza viewer em rota viewer', async () => {
    const authenticate = createAuthMiddlewareForTests(jwtService);
    const viewerApp = Fastify();
    const { default: errorHandlerPlugin } =
      await import('../../../../http/plugins/error-handler.ts');
    await errorHandlerPlugin(viewerApp);

    viewerApp.get(
      '/authenticated',
      {
        preHandler: [authenticate, requireRole('viewer')],
      },
      async () => ({ ok: true }),
    );

    const token = jwtService.sign({ sub: 'viewer-id', role: USER_ROLE.VIEWER });

    const response = await viewerApp.inject({
      method: 'GET',
      url: '/authenticated',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    await viewerApp.close();
  });
});
