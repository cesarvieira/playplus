import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODE, USER_ROLE } from '@playplus/shared';

import { JwtService } from '#modules/user/infra/jwt.service';
import { createAuthenticateMiddleware } from '../authenticate.middleware.ts';
import { requireRole } from '../require-role.middleware.ts';

const JWT_SECRET = 'test-secret-with-at-least-32-characters';

describe('requireRole', () => {
  let app: ReturnType<typeof Fastify>;
  let jwtService: JwtService;

  beforeEach(async () => {
    jwtService = new JwtService({ secret: JWT_SECRET, accessTtlSeconds: 900 });
    const authenticate = createAuthenticateMiddleware(jwtService);

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
    const authenticate = createAuthenticateMiddleware(jwtService);
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
