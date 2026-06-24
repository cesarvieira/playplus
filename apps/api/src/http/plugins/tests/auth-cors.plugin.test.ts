import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#config/env', () => ({
  env: {
    NODE_ENV: 'development',
    CORS_ADMIN_ORIGIN: 'https://admin.playplus.localhost:3001',
  },
}));

describe('authCorsPlugin', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    const { default: authCorsPlugin } = await import('../../../http/plugins/auth-cors.plugin.ts');

    app = Fastify();
    await authCorsPlugin(app);

    app.post('/v1/auth/login', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({ access_token: 'token', expires_in: 900 });
    });

    app.post('/v1/auth/refresh', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({ ok: true });
    });

    app.post('/v1/auth/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(204).send();
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde preflight OPTIONS em /auth/login com credentials', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/login',
      headers: {
        origin: 'https://admin.playplus.localhost:3001',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://admin.playplus.localhost:3001',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('responde preflight OPTIONS em /auth/refresh com credentials', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/refresh',
      headers: {
        origin: 'https://admin.playplus.localhost:3001',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('responde preflight OPTIONS em /auth/logout com credentials', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/logout',
      headers: {
        origin: 'https://admin.playplus.localhost:3001',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('não aplica CORS em outras rotas', async () => {
    app.get('/v1/health', async () => ({ status: 'ok' }));

    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'https://admin.playplus.localhost:3001' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('inclui CORS em POST /v1/auth/refresh', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { origin: 'http://localhost:3001' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
