import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACCESS_TOKEN_COOKIE,
  clearAccessTokenCookie,
  getAccessTokenFromCookie,
  setAccessTokenCookie,
} from '../access-cookie';

const { getCookieMock, setCookieMock, deleteCookieMock } = vi.hoisted(() => ({
  getCookieMock: vi.fn(),
  setCookieMock: vi.fn(),
  deleteCookieMock: vi.fn(),
}));

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return {
    ...actual,
    getCookie: getCookieMock,
    setCookie: setCookieMock,
    deleteCookie: deleteCookieMock,
  };
});

const event = { node: { req: { headers: {} } } } as unknown as H3Event;

describe('access-cookie', () => {
  beforeEach(() => {
    getCookieMock.mockReset();
    setCookieMock.mockReset();
    deleteCookieMock.mockReset();
    delete process.env.COOKIE_SECURE;
  });

  it('lê access_token do cookie', () => {
    getCookieMock.mockReturnValue('jwt-token');

    expect(getAccessTokenFromCookie(event)).toBe('jwt-token');
    expect(getCookieMock).toHaveBeenCalledWith(event, ACCESS_TOKEN_COOKIE);
  });

  it('grava cookie HttpOnly com maxAge', () => {
    process.env.COOKIE_SECURE = 'true';

    setAccessTokenCookie(event, 'jwt-token', 900);

    expect(setCookieMock).toHaveBeenCalledWith(event, ACCESS_TOKEN_COOKIE, 'jwt-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    });
  });

  it('remove cookie access_token', () => {
    clearAccessTokenCookie(event);

    expect(deleteCookieMock).toHaveBeenCalledWith(event, ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });
});
