import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE } from '@playplus/shared';

const refreshExecute = vi.hoisted(() => vi.fn());
const logoutExecute = vi.hoisted(() => vi.fn());

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
    execute = vi.fn();
  },
}));

vi.mock('../../application/refresh-token.use-case.ts', () => ({
  RefreshTokenUseCase: class MockRefreshTokenUseCase {
    execute = refreshExecute;
  },
}));

vi.mock('../../application/logout.use-case.ts', () => ({
  LogoutUseCase: class MockLogoutUseCase {
    execute = logoutExecute;
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

describe('POST /v1/auth/refresh e /v1/auth/logout', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    refreshExecute.mockReset();
    logoutExecute.mockReset();

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

  it('refresh retorna 200 com access_token e cookie rotacionado', async () => {
    refreshExecute.mockResolvedValue({
      accessToken: 'new-jwt-access-token',
      expiresIn: 900,
      refreshToken: 'new-refresh-token-uuid',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: 'old-refresh-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      access_token: 'new-jwt-access-token',
      expires_in: 900,
    });

    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toEqual(expect.stringContaining('refresh_token=new-refresh-token-uuid'));
    expect(refreshExecute).toHaveBeenCalledWith('old-refresh-token');
  });

  it('refresh retorna 401 INVALID_TOKEN sem cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.INVALID_TOKEN,
        message: 'Refresh token inválido ou expirado',
      },
    });
    expect(refreshExecute).not.toHaveBeenCalled();
  });

  it('refresh retorna 401 INVALID_TOKEN quando use case rejeita token reutilizado', async () => {
    const { InvalidTokenError } = await import('@playplus/shared');
    refreshExecute.mockRejectedValue(new InvalidTokenError());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: 'reused-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: ERROR_CODE.INVALID_TOKEN,
        message: 'Refresh token inválido ou expirado',
      },
    });
  });

  it('logout retorna 204 e limpa cookie', async () => {
    logoutExecute.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      cookies: { refresh_token: 'refresh-to-revoke' },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(logoutExecute).toHaveBeenCalledWith('refresh-to-revoke');

    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toEqual(expect.stringContaining('refresh_token='));
  });

  it('logout é idempotente sem cookie', async () => {
    logoutExecute.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
    });

    expect(response.statusCode).toBe(204);
    expect(logoutExecute).toHaveBeenCalledWith(undefined);
  });
});
