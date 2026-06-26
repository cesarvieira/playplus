import type { H3Event } from 'h3';
import { appendResponseHeader, getRequestHeader } from 'h3';

import type { ApiAuthResponse } from '~/utils/auth';

import { getAccessTokenFromCookie, setAccessTokenCookie } from './access-cookie';
import { getServerRuntimeConfig } from './runtime-config';
import { readSessionFromEvent, verifyAccessToken, type SessionPayload } from './session';

const SERVER_SESSION_CONTEXT_KEY = 'playplusServerSession';
const SERVER_SESSION_IN_FLIGHT_CONTEXT_KEY = 'playplusServerSessionInFlight';
const SERVER_ACCESS_TOKEN_CONTEXT_KEY = 'playplusServerAccessToken';

export function getServerAccessToken(event: H3Event): string | undefined {
  const cached = event.context[SERVER_ACCESS_TOKEN_CONTEXT_KEY];

  if (typeof cached === 'string' && cached.length > 0) {
    return cached;
  }

  return getAccessTokenFromCookie(event);
}

function getCachedServerSession(event: H3Event): SessionPayload | null | undefined {
  return event.context[SERVER_SESSION_CONTEXT_KEY] as SessionPayload | null | undefined;
}

function setCachedServerSession(event: H3Event, session: SessionPayload | null): void {
  event.context[SERVER_SESSION_CONTEXT_KEY] = session;
}

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
  event.context[SERVER_ACCESS_TOKEN_CONTEXT_KEY] = accessToken;
  appendSetCookieHeaders(event, collectSetCookieHeaders(response.headers));

  return verifyAccessToken(accessToken, config.jwtSecret);
}

export async function ensureServerSession(event: H3Event): Promise<SessionPayload | null> {
  const cached = getCachedServerSession(event);

  if (cached !== undefined) {
    return cached;
  }

  const inFlight = event.context[SERVER_SESSION_IN_FLIGHT_CONTEXT_KEY] as Promise<SessionPayload | null> | undefined;

  if (inFlight) {
    return inFlight;
  }

  const promise = resolveServerSession(event);
  event.context[SERVER_SESSION_IN_FLIGHT_CONTEXT_KEY] = promise;

  try {
    return await promise;
  } finally {
    event.context[SERVER_SESSION_IN_FLIGHT_CONTEXT_KEY] = undefined;
  }
}

async function resolveServerSession(event: H3Event): Promise<SessionPayload | null> {
  const config = getServerRuntimeConfig();
  const session = readSessionFromEvent(event, config.jwtSecret);

  if (session) {
    const accessToken = getAccessTokenFromCookie(event);

    if (accessToken) {
      event.context[SERVER_ACCESS_TOKEN_CONTEXT_KEY] = accessToken;
    }

    setCachedServerSession(event, session);
    return session;
  }

  const refreshed = await refreshServerSession(event);
  setCachedServerSession(event, refreshed);
  return refreshed;
}
