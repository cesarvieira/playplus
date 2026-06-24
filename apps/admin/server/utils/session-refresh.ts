import type { H3Event } from 'h3';
import { appendResponseHeader, getRequestHeader } from 'h3';

import type { ApiAuthResponse } from '~/utils/auth';

import { setAccessTokenCookie } from './access-cookie';
import { getServerRuntimeConfig } from './runtime-config';
import { readSessionFromEvent, verifyAccessToken, type SessionPayload } from './session';

function appendSetCookieHeaders(event: H3Event, setCookieHeaders: string[]): void {
  for (const header of setCookieHeaders) {
    appendResponseHeader(event, 'set-cookie', header);
  }
}

function collectSetCookieHeaders(headers: Headers): string[] {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const single = headers.get('set-cookie');

  return single ? [single] : [];
}

export async function refreshServerSession(event: H3Event): Promise<SessionPayload | null> {
  const config = getServerRuntimeConfig();
  const cookieHeader = getRequestHeader(event, 'cookie');

  if (!cookieHeader) {
    return null;
  }

  const { apiOfetchRaw } = await import('./api-ofetch.server');

  const response = await apiOfetchRaw<ApiAuthResponse>('/auth/refresh', {
    method: 'POST',
    baseURL: config.public.apiUrl,
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!response.ok || !response._data) {
    return null;
  }

  const { access_token: accessToken, expires_in: expiresIn } = response._data;

  if (!accessToken || typeof expiresIn !== 'number') {
    return null;
  }

  setAccessTokenCookie(event, accessToken, expiresIn);
  appendSetCookieHeaders(event, collectSetCookieHeaders(response.headers));

  return verifyAccessToken(accessToken, config.jwtSecret);
}

export async function ensureServerSession(event: H3Event): Promise<SessionPayload | null> {
  const config = getServerRuntimeConfig();
  const session = readSessionFromEvent(event, config.jwtSecret);

  if (session) {
    return session;
  }

  return refreshServerSession(event);
}
