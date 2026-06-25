import jwt from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { ACCESS_TOKEN_COOKIE, setAccessTokenCookie } from '../access-cookie';
import { ensureServerSession, refreshServerSession } from '../session-refresh';

const JWT_SECRET = 'session-refresh-test-secret';

const apiOfetchRaw = vi.hoisted(() => vi.fn());
const appendResponseHeaderMock = vi.hoisted(() => vi.fn());

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return {
    ...actual,
    appendResponseHeader: appendResponseHeaderMock,
  };
});

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
  return jwt.sign({ sub: 'user-id', role: USER_ROLE.VIEWER }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });
}

function createEvent(accessToken?: string, cookieHeader?: string): H3Event {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  } else if (accessToken) {
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
    appendResponseHeaderMock.mockReset();
    vi.mocked(setAccessTokenCookie).mockClear();
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

  it('deduplica refresh concorrente na mesma requisição', async () => {
    const expiredToken = signAccessToken(-60);
    const freshToken = signAccessToken(900);
    const event = createEvent(expiredToken);

    apiOfetchRaw.mockResolvedValue({
      ok: true,
      _data: { access_token: freshToken, expires_in: 900 },
      headers: new Headers(),
    });

    const [first, second] = await Promise.all([
      ensureServerSession(event),
      ensureServerSession(event),
    ]);

    expect(first).toEqual(second);
    expect(apiOfetchRaw).toHaveBeenCalledTimes(1);
  });
});

describe('refreshServerSession', () => {
  beforeEach(() => {
    apiOfetchRaw.mockReset();
    appendResponseHeaderMock.mockReset();
    vi.mocked(setAccessTokenCookie).mockClear();
  });

  it('retorna null sem header cookie', async () => {
    const event = createEvent();

    await expect(refreshServerSession(event)).resolves.toBeNull();
    expect(apiOfetchRaw).not.toHaveBeenCalled();
  });

  it('retorna null quando refresh falha', async () => {
    const event = createEvent(undefined, 'refresh_token=opaque');

    apiOfetchRaw.mockResolvedValue({ ok: false, _data: null, headers: new Headers() });

    await expect(refreshServerSession(event)).resolves.toBeNull();
  });

  it('retorna null quando payload de refresh é inválido', async () => {
    const event = createEvent(undefined, 'refresh_token=opaque');

    apiOfetchRaw.mockResolvedValue({
      ok: true,
      _data: { access_token: '', expires_in: 'invalid' },
      headers: new Headers(),
    });

    await expect(refreshServerSession(event)).resolves.toBeNull();
  });

  it('usa fallback de set-cookie quando getSetCookie não existe', async () => {
    const freshToken = signAccessToken(900);
    const event = createEvent(undefined, 'refresh_token=opaque');
    const headers = {
      getSetCookie: undefined,
      get: (name: string) => (name === 'set-cookie' ? 'refresh_token=new; Path=/' : null),
    };

    apiOfetchRaw.mockResolvedValue({
      ok: true,
      _data: { access_token: freshToken, expires_in: 900 },
      headers,
    });

    const session = await refreshServerSession(event);

    expect(session?.userId).toBe('user-id');
    expect(setAccessTokenCookie).toHaveBeenCalledWith(event, freshToken, 900);
    expect(appendResponseHeaderMock).toHaveBeenCalledWith(
      event,
      'set-cookie',
      'refresh_token=new; Path=/',
    );
  });
});
