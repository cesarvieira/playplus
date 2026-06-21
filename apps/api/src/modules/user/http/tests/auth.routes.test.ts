import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE } from '@playplus/shared';

import { InvalidCredentialsError } from '#modules/user/domain/invalid-credentials.error';

const execute = vi.hoisted(() => vi.fn());

vi.mock('#config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-with-at-least-32-characters',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 604800,
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
  },
}));

vi.mock('#infra/database/client', () => ({
  db: {},
}));

vi.mock('#infra/valkey/client', () => ({
  valkey: {},
}));

vi.mock('../../application/login.use-case.ts', () => ({
  LoginUseCase: class MockLoginUseCase {
    execute = execute;
  },
}));

vi.mock('../../infra/user.repository.ts', () => ({
  UserRepository: vi.fn(),
}));

vi.mock('../../infra/jwt.service.ts', () => ({
  JwtService: vi.fn(),
}));

vi.mock('../../infra/refresh-token.store.ts', () => ({
  RefreshTokenStore: vi.fn(),
}));

describe('POST /v1/auth/login', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    execute.mockReset();

    const [{ default: errorHandlerPlugin }, { default: authRoutes }] = await Promise.all([
      import('../../../../http/plugins/error-handler.ts'),
      import('../auth.routes.ts'),
    ]);

    app = Fastify();
    await app.register(cookie);
    await errorHandlerPlugin(app);
    await app.register(authRoutes, { prefix: '/v1' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna 422 quando password tem menos de 8 caracteres', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'admin@playplus.local',
        password: 'short',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.VALIDATION_ERROR,
        message: expect.any(String),
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('retorna 401 UNAUTHORIZED com mensagem genérica para credenciais inválidas', async () => {
    execute.mockRejectedValue(new InvalidCredentialsError());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'admin@playplus.local',
        password: 'wrong-password',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.UNAUTHORIZED,
        message: 'Credenciais inválidas',
      },
    });
  });

  it('retorna 200 com access_token, expires_in e cookie refresh_token', async () => {
    execute.mockResolvedValue({
      accessToken: 'jwt-access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token-uuid',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: '  Admin@PlayPlus.Local  ',
        password: 'correct-password',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      access_token: 'jwt-access-token',
      expires_in: 900,
    });

    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie).toEqual(expect.stringContaining('refresh_token=refresh-token-uuid'));
    expect(setCookie).toEqual(expect.stringContaining('HttpOnly'));
    expect(setCookie).toEqual(expect.stringContaining('Path=/'));
    expect(setCookie).toEqual(expect.stringContaining('Max-Age='));

    expect(execute).toHaveBeenCalledWith({
      email: 'admin@playplus.local',
      password: 'correct-password',
    });
  });
});
