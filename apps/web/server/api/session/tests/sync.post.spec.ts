import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { verifyAccessToken } from '#server/utils/session';

const JWT_SECRET = 'sync-route-test-secret';

function signAccessToken(expiresInSeconds = 900): string {
  return jwt.sign({ sub: 'user-1', role: USER_ROLE.VIEWER }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });
}

describe('POST /api/session/sync validation', () => {
  it('aceita access token válido para persistência no cookie', () => {
    const token = signAccessToken();
    const session = verifyAccessToken(token, JWT_SECRET);

    expect(session?.userId).toBe('user-1');
  });

  it('rejeita token inválido', () => {
    expect(verifyAccessToken('invalid', JWT_SECRET)).toBeNull();
  });
});
