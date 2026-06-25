import type { H3Event } from 'h3';
import { deleteCookie, getCookie, setCookie } from 'h3';

export const ACCESS_TOKEN_COOKIE = 'access_token';

function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE === 'true';
}

export function getAccessTokenFromCookie(event: H3Event): string | undefined {
  return getCookie(event, ACCESS_TOKEN_COOKIE);
}

export function setAccessTokenCookie(
  event: H3Event,
  accessToken: string,
  expiresInSeconds: number,
): void {
  setCookie(event, ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: expiresInSeconds,
  });
}

export function clearAccessTokenCookie(event: H3Event): void {
  deleteCookie(event, ACCESS_TOKEN_COOKIE, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
  });
}
