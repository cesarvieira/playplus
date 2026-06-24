import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, USER_ROLE, UserNotFoundError } from '@playplus/shared';

const getMeExecute = vi.hoisted(() => vi.fn());

vi.mock('#config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-with-at-least-32-characters',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 604800,
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
    M2M_SERVICE_TOKEN: 'm2m-service-token-with-at-least-32-characters',
    DELEGATION_JWT_SECRET: 'delegation-secret-with-at-least-32-chars',
    DELEGATION_JWT_TTL_SECONDS: 60,
  },
}));

vi.mock('#infra/database/client', () => ({
  db: {},
}));

vi.mock('../../application/get-me.use-case.ts', () => ({
  GetMeUseCase: class MockGetMeUseCase {
    execute = getMeExecute;
  },
}));

vi.mock('../../infra/user.repository.ts', () => ({
  UserRepository: vi.fn(),
}));

describe('GET /v1/me', () => {
  let app: ReturnType<typeof Fastify>;
  let accessToken: string;

  beforeEach(async () => {
    getMeExecute.mockReset();

    const [{ default: errorHandlerPlugin }, { JwtService }, { default: meRoutes }] =
      await Promise.all([
        import('../../../../http/plugins/error-handler.ts'),
        import('../../infra/jwt.service.ts'),
        import('../me.routes.ts'),
      ]);

    const jwtService = new JwtService({
      secret: 'test-secret-with-at-least-32-characters',
      accessTtlSeconds: 900,
    });
    accessToken = jwtService.sign({ sub: 'user-id', role: USER_ROLE.ADMIN });

    app = Fastify();
    await app.register(cookie);
    await errorHandlerPlugin(app);
    await app.register(meRoutes, { prefix: '/v1' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna 401 UNAUTHORIZED sem Bearer', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.UNAUTHORIZED,
        message: 'Não autorizado',
      },
    });
    expect(getMeExecute).not.toHaveBeenCalled();
  });

  it('retorna 200 com perfil em snake_case', async () => {
    getMeExecute.mockResolvedValue({
      id: 'user-id',
      email: 'admin@playplus.localhost',
      role: USER_ROLE.ADMIN,
      createdAt: '2026-06-20T12:00:00.000Z',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: 'user-id',
      email: 'admin@playplus.localhost',
      role: USER_ROLE.ADMIN,
      created_at: '2026-06-20T12:00:00.000Z',
    });
    expect(getMeExecute).toHaveBeenCalledWith({ userId: 'user-id' });
  });

  it('retorna 404 USER_NOT_FOUND quando usuário não existe', async () => {
    getMeExecute.mockRejectedValue(new UserNotFoundError());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.USER_NOT_FOUND,
        message: 'Usuário não encontrado',
      },
    });
  });
});
