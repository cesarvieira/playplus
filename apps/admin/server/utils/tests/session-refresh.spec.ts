import jwt from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { ACCESS_TOKEN_COOKIE } from '../access-cookie';
import { ensureServerSession } from '../session-refresh';

const JWT_SECRET = 'session-refresh-test-secret';

const apiOfetchRaw = vi.hoisted(() => vi.fn());

vi.mock('../runtime-config', () => ({
  getServerRuntimeConfig: () => ({
    jwtSecret: JWT_SECRET,
    public: { apiUrl: 'http://localhost:3000/v1' },
  }),
}));

vi.mock('../access-cookie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../access-cookie')>();
  return {
    ...actual,
    setAccessTokenCookie: vi.fn(),
  };
});

vi.mock('../api-ofetch.server', () => ({
  apiOfetchRaw,
}));

function signAccessToken(expiresInSeconds: number): string {
  return jwt.sign({ sub: 'user-id', role: USER_ROLE.ADMIN }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });
}

function createEvent(accessToken?: string): H3Event {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; refresh_token=old-refresh`;
  }

  return {
    node: { req: { headers } },
    context: {},
  } as unknown as H3Event;
}

describe('ensureServerSession', () => {
  beforeEach(() => {
    apiOfetchRaw.mockReset();
  });

  it('reutiliza sessão em cache na mesma requisição sem novo refresh', async () => {
    const expiredToken = signAccessToken(-60);
    const freshToken = signAccessToken(900);
    const event = createEvent(expiredToken);

    apiOfetchRaw.mockResolvedValue({
      ok: true,
      _data: { access_token: freshToken, expires_in: 900 },
      headers: new Headers(),
    });

    const first = await ensureServerSession(event);
    const second = await ensureServerSession(event);

    expect(first?.userId).toBe('user-id');
    expect(second).toEqual(first);
    expect(apiOfetchRaw).toHaveBeenCalledTimes(1);
  });

  it('lê token válido do cookie sem chamar refresh', async () => {
    const validToken = signAccessToken(900);
    const event = createEvent(validToken);

    const session = await ensureServerSession(event);

    expect(session?.userId).toBe('user-id');
    expect(apiOfetchRaw).not.toHaveBeenCalled();
  });
});
