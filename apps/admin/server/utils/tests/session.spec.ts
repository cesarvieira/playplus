import jwt from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { describe, expect, it } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { ACCESS_TOKEN_COOKIE } from '../access-cookie';
import { isSessionExpired, readSessionFromEvent, verifyAccessToken } from '../session';

const JWT_SECRET = 'access-token-test-secret';

function signAccessToken(claims: { sub: string; role: string }, expiresInSeconds: number): string {
  return jwt.sign(claims, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });
}

function createEventWithCookie(cookieValue?: string): H3Event {
  return {
    node: {
      req: {
        headers: cookieValue ? { cookie: `${ACCESS_TOKEN_COOKIE}=${cookieValue}` } : {},
      },
    },
  } as unknown as H3Event;
}

describe('session', () => {
  it('verifica access token válido com sub e role', () => {
    const token = signAccessToken({ sub: 'user-id', role: USER_ROLE.ADMIN }, 900);
    const session = verifyAccessToken(token, JWT_SECRET);

    expect(session).toEqual(
      expect.objectContaining({
        userId: 'user-id',
        role: USER_ROLE.ADMIN,
      }),
    );
    expect(session?.exp).toBeTypeOf('number');
  });

  it('retorna null para token inválido', () => {
    expect(verifyAccessToken('not-a-jwt', JWT_SECRET)).toBeNull();
  });

  it('retorna null para payload string', () => {
    const token = jwt.sign('string-payload', JWT_SECRET);
    expect(verifyAccessToken(token, JWT_SECRET)).toBeNull();
  });

  it('retorna null para claims incompletos', () => {
    const token = jwt.sign({ sub: 'user-id' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: 60 });
    expect(verifyAccessToken(token, JWT_SECRET)).toBeNull();
  });

  it('lê sessão do cookie access_token', () => {
    const token = signAccessToken({ sub: 'cookie-user', role: USER_ROLE.ADMIN }, 900);
    const event = createEventWithCookie(token);
    const session = readSessionFromEvent(event, JWT_SECRET);

    expect(session?.userId).toBe('cookie-user');
  });

  it('retorna null sem cookie', () => {
    const event = createEventWithCookie();
    expect(readSessionFromEvent(event, JWT_SECRET)).toBeNull();
  });

  it('detecta sessão expirada', () => {
    const token = signAccessToken({ sub: 'user-id', role: USER_ROLE.ADMIN }, -10);
    const session = verifyAccessToken(token, JWT_SECRET);

    expect(session).not.toBeNull();
    expect(isSessionExpired(session!)).toBe(true);
  });
});
