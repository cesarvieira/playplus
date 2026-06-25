import { getCookie, type H3Event } from 'h3';

const ACCESS_TOKEN_COOKIE = 'access_token';

export function hasSessionCookie(event: H3Event): boolean {
  return Boolean(getCookie(event, ACCESS_TOKEN_COOKIE));
}
