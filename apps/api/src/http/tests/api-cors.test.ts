import cors from '@fastify/cors';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveCorsOrigin } from '../cors-origins.ts';

vi.mock('#config/env', () => ({
  env: {
    NODE_ENV: 'development',
    CORS_ADMIN_ORIGIN: 'https://admin.playplus.localhost:3001',
  },
}));

describe('api CORS', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(cors, {
      origin: resolveCorsOrigin,
      credentials: false,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.patch('/v1/videos/:id/schedule', async () => ({ ok: true }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('permite preflight PATCH em rotas de publicação', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/videos/9907c5d6-6a56-493c-9ed4-0466d688be99/schedule',
      headers: {
        origin: 'https://admin.playplus.localhost:3001',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://admin.playplus.localhost:3001',
    );
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });
});
