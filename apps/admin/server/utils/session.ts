import type { H3Event } from 'h3';
import jwt from 'jsonwebtoken';

import type { UserRole } from '@playplus/shared';

import { getAccessTokenFromCookie } from './access-cookie';

const CLOCK_TOLERANCE_SECONDS = 30;

export interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function verifyAccessToken(token: string, secret: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });

    if (typeof payload === 'string') {
      return null;
    }

    const { sub, role, exp } = payload as AccessTokenClaims;

    if (typeof sub !== 'string' || typeof role !== 'string' || typeof exp !== 'number') {
      return null;
    }

    return { userId: sub, role, exp };
  } catch {
    return null;
  }
}

export function readSessionFromEvent(event: H3Event, jwtSecret: string): SessionPayload | null {
  const accessToken = getAccessTokenFromCookie(event);

  if (!accessToken) {
    return null;
  }

  return verifyAccessToken(accessToken, jwtSecret);
}

export function isSessionExpired(
  session: SessionPayload,
  skewSeconds = CLOCK_TOLERANCE_SECONDS,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  return session.exp <= now + skewSeconds;
}
