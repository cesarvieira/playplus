import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitedError, USER_ROLE } from '@playplus/shared';

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

// Sobrescreve os presets pra um limite minúsculo — o objetivo aqui não é
// validar o número 300 (isso é calibração de tráfego, não corretude), é
// provar que o mecanismo de rate limit realmente bloqueia acima do limite
// configurado e que a chave usada é por usuário verificado, não por IP puro
// (que em app.inject() é sempre o mesmo IP fake — se a chave fosse só o IP,
// o segundo teste abaixo falharia).
vi.mock('#http/rate-limit-presets', () => ({
  RATE_LIMIT_READ: { max: 1, timeWindow: '1 minute' },
  RATE_LIMIT_WRITE: { max: 1, timeWindow: '1 minute' },
  RATE_LIMIT_SENSITIVE_WRITE: { max: 1, timeWindow: '1 minute' },
}));

describe('GET /v1/me — rate limit', () => {
  let app: ReturnType<typeof Fastify>;
  let sign: (sub: string) => string;

  beforeEach(async () => {
    getMeExecute.mockReset();
    getMeExecute.mockResolvedValue({
      id: 'user-id',
      email: 'admin@playplus.localhost',
      role: USER_ROLE.ADMIN,
      createdAt: '2026-06-20T12:00:00.000Z',
    });

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
    sign = (sub: string) => jwtService.sign({ sub, role: USER_ROLE.ADMIN });

    app = Fastify();
    await app.register(cookie);
    // errorResponseBuilder replicado igual ao de server.ts — sem ele, o
    // errorHandlerPlugin engole o 429 do rate-limit e devolve 500 (ver
    // rate-limit-error-handling.test.ts para o teste dedicado a essa
    // regressão).
    await app.register(rateLimit, {
      global: false,
      errorResponseBuilder: () => new RateLimitedError(),
    });
    await errorHandlerPlugin(app);
    await app.register(meRoutes, { prefix: '/v1' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna 429 quando o mesmo usuário excede o limite da rota', async () => {
    const token = sign('user-a');

    const first = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(second.statusCode).toBe(429);
  });

  it('não compartilha cota entre usuários diferentes, mesmo vindo do mesmo IP simulado', async () => {
    const tokenA = sign('user-a');
    const tokenB = sign('user-b');

    const first = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(first.statusCode).toBe(200);

    // user-a já estourou a cota (max: 1). user-b, mesmo simulando o mesmo IP
    // via app.inject(), deve continuar liberado — a chave é por usuário
    // verificado (ver rate-limit-key.ts), não por IP.
    const second = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(second.statusCode).toBe(200);
  });

  it('cai no fallback por IP para requisições sem Bearer válido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
    });

    // Sem token, a autenticação de verdade rejeita com 401 — o importante
    // aqui é que o rate limit não quebra antes disso (ele já rodou no
    // onRequest usando fallback por IP) e não impede a resposta normal do
    // fluxo de auth.
    expect(response.statusCode).toBe(401);
  });
});
