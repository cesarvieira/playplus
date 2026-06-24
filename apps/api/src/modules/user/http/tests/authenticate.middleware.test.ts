import Fastify, { type FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE } from '@playplus/shared';

import { DelegationJwtService } from '#modules/user/infra/delegation-jwt.service';
import { JwtService } from '#modules/user/infra/jwt.service';
import type { UserRepository } from '#modules/user/infra/user.repository';
import { createAuthenticateMiddleware } from '../authenticate.middleware.ts';

const JWT_SECRET = 'test-secret-with-at-least-32-characters';
const M2M_TOKEN = 'm2m-service-token-with-at-least-32-characters';
const DELEGATION_SECRET = 'delegation-secret-with-at-least-32-chars';

describe('createAuthenticateMiddleware', () => {
  let app: ReturnType<typeof Fastify>;
  let jwtService: JwtService;
  let delegationJwtService: DelegationJwtService;
  let findById: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    jwtService = new JwtService({ secret: JWT_SECRET, accessTtlSeconds: 900 });
    delegationJwtService = new DelegationJwtService({
      secret: DELEGATION_SECRET,
      ttlSeconds: 60,
    });
    findById = vi.fn();

    const userRepository = {
      findById,
    } as unknown as UserRepository;

    const { default: errorHandlerPlugin } =
      await import('../../../../http/plugins/error-handler.ts');
    const authenticate = createAuthenticateMiddleware({
      jwtService,
      delegationJwtService,
      m2mServiceToken: M2M_TOKEN,
      userRepository,
    });

    app = Fastify();
    await errorHandlerPlugin(app);

    app.get(
      '/protected',
      {
        preHandler: [authenticate],
      },
      async (request: FastifyRequest) => ({
        userId: request.user.id,
        role: request.user.role,
      }),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('popula request.user com Bearer válido', async () => {
    const token = jwtService.sign({ sub: 'user-id', role: USER_ROLE.ADMIN });

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: 'user-id', role: USER_ROLE.ADMIN });
  });

  it('popula request.user via M2M e X-User-Id delegado', async () => {
    findById.mockResolvedValue({
      id: 'user-id',
      role: USER_ROLE.ADMIN,
    });

    const delegation = delegationJwtService.sign('user-id');

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${M2M_TOKEN}`,
        'x-user-id': delegation,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: 'user-id', role: USER_ROLE.ADMIN });
    expect(findById).toHaveBeenCalledWith('user-id');
  });

  it('retorna 401 com M2M válido sem X-User-Id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${M2M_TOKEN}` },
    });

    expect(response.statusCode).toBe(401);
    expect(findById).not.toHaveBeenCalled();
  });

  it('retorna 401 com M2M válido e X-User-Id forjado', async () => {
    const forged = new DelegationJwtService({
      secret: 'wrong-delegation-secret-at-least-32-ch',
      ttlSeconds: 60,
    }).sign('user-id');

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${M2M_TOKEN}`,
        'x-user-id': forged,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('retorna 401 UNAUTHORIZED sem header Authorization', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.UNAUTHORIZED,
        message: 'Não autorizado',
      },
    });
  });

  it('retorna 401 UNAUTHORIZED com token inválido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.UNAUTHORIZED,
        message: 'Não autorizado',
      },
    });
  });
});
