import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitedError } from '@playplus/shared';

const loginExecute = vi.hoisted(() => vi.fn());
const refreshExecute = vi.hoisted(() => vi.fn());
const logoutExecute = vi.hoisted(() => vi.fn());

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

vi.mock('#infra/valkey/client', () => ({
  valkey: {},
}));

// Limite minúsculo só pra tornar o teste rápido e determinístico — o valor
// real (60/min, ver rate-limit-presets.ts) é calibração de tráfego, não
// corretude do mecanismo.
vi.mock('#http/rate-limit-presets', () => ({
  RATE_LIMIT_READ: { max: 1, timeWindow: '1 minute' },
  RATE_LIMIT_WRITE: { max: 1, timeWindow: '1 minute' },
  RATE_LIMIT_SENSITIVE_WRITE: { max: 1, timeWindow: '1 minute' },
}));

vi.mock('../../application/login.use-case.ts', () => ({
  LoginUseCase: class MockLoginUseCase {
    execute = loginExecute;
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

describe('POST /v1/auth/* — rate limit por rota', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    loginExecute.mockReset();
    loginExecute.mockResolvedValue({
      accessToken: 'jwt-access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token-uuid',
    });
    refreshExecute.mockReset();
    refreshExecute.mockResolvedValue({
      accessToken: 'jwt-access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token-uuid',
    });

    const [{ default: errorHandlerPlugin }, { default: authRoutes }] = await Promise.all([
      import('../../../../http/plugins/error-handler.ts'),
      import('../auth.routes.ts'),
    ]);

    app = Fastify();
    await app.register(cookie);
    // errorResponseBuilder replicado igual ao de server.ts — sem ele, o 429
    // do rate-limit é engolido pelo errorHandlerPlugin e vira 500 (ver
    // rate-limit-error-handling.test.ts para o teste dedicado a essa
    // regressão).
    await app.register(rateLimit, {
      global: false,
      errorResponseBuilder: () => new RateLimitedError(),
    });
    await errorHandlerPlugin(app);
    await app.register(authRoutes, { prefix: '/v1' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('bloqueia com 429 após exceder o limite configurado em /auth/login', async () => {
    const payload = { email: 'admin@playplus.localhost', password: 'correct-password' };

    const first = await app.inject({ method: 'POST', url: '/v1/auth/login', payload });
    const second = await app.inject({ method: 'POST', url: '/v1/auth/login', payload });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(loginExecute).toHaveBeenCalledTimes(1);
  });

  it('cada rota de auth tem cota própria — estourar /login não bloqueia /refresh', async () => {
    const payload = { email: 'admin@playplus.localhost', password: 'correct-password' };

    await app.inject({ method: 'POST', url: '/v1/auth/login', payload });
    const loginBlocked = await app.inject({ method: 'POST', url: '/v1/auth/login', payload });
    expect(loginBlocked.statusCode).toBe(429);

    // /auth/refresh não tem cookie de refresh token no teste, então o
    // esperado é 401 (token ausente) — não 429. Cada rota tem seu próprio
    // bucket via `config.rateLimit` em auth.routes.ts, então estourar
    // /login não deveria consumir a cota de /refresh.
    const refreshResponse = await app.inject({ method: 'POST', url: '/v1/auth/refresh' });
    expect(refreshResponse.statusCode).toBe(401);
  });
});
