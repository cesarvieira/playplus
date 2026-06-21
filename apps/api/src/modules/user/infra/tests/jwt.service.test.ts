import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { JwtService } from '../jwt.service.ts';

const TEST_SECRET = 'test-secret-with-at-least-32-characters';

describe('JwtService', () => {
  const service = new JwtService({
    secret: TEST_SECRET,
    accessTtlSeconds: 900,
  });

  it('assina e verifica token com claims sub, role, iat e exp', () => {
    const token = service.sign({ sub: 'user-id', role: USER_ROLE.ADMIN });
    const payload = service.verify(token);

    expect(payload.sub).toBe('user-id');
    expect(payload.role).toBe(USER_ROLE.ADMIN);
    expect(payload.iat).toEqual(expect.any(Number));
    expect(payload.exp).toEqual(expect.any(Number));
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('rejeita token expirado além da tolerância de clock skew', () => {
    const expiredToken = jwt.sign(
      {
        sub: 'user-id',
        role: USER_ROLE.VIEWER,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      TEST_SECRET,
      { algorithm: 'HS256', noTimestamp: true },
    );

    expect(() => service.verify(expiredToken)).toThrow(jwt.TokenExpiredError);
  });

  it('aceita token levemente expirado dentro da tolerância de 30s', () => {
    const now = Math.floor(Date.now() / 1000);
    const slightlyExpiredToken = jwt.sign(
      {
        sub: 'user-id',
        role: USER_ROLE.VIEWER,
        exp: now - 20,
      },
      TEST_SECRET,
      { algorithm: 'HS256' },
    );

    const payload = service.verify(slightlyExpiredToken);

    expect(payload.sub).toBe('user-id');
    expect(payload.role).toBe(USER_ROLE.VIEWER);
  });
});
