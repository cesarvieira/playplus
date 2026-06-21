import Fastify, { type FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODE, USER_ROLE } from '@playplus/shared';

import { JwtService } from '#modules/user/infra/jwt.service';
import { createAuthenticateMiddleware } from '../authenticate.middleware.ts';

const JWT_SECRET = 'test-secret-with-at-least-32-characters';

describe('createAuthenticateMiddleware', () => {
  let app: ReturnType<typeof Fastify>;
  let jwtService: JwtService;

  beforeEach(async () => {
    jwtService = new JwtService({ secret: JWT_SECRET, accessTtlSeconds: 900 });

    const { default: errorHandlerPlugin } =
      await import('../../../../http/plugins/error-handler.ts');
    const authenticate = createAuthenticateMiddleware(jwtService);

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
