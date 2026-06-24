import { describe, expect, it } from 'vitest';
import { USER_ROLE } from '@playplus/shared';

import { JwtService } from '#modules/user/infra/jwt.service';

import { authenticateWsToken } from '../ws-auth.ts';

const JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

describe('authenticateWsToken', () => {
  const jwtService = new JwtService({ secret: JWT_SECRET, accessTtlSeconds: 900 });

  it('rejeita token ausente', () => {
    expect(authenticateWsToken(undefined, jwtService)).toEqual({
      ok: false,
      error: 'missing',
    });
  });

  it('rejeita token vazio', () => {
    expect(authenticateWsToken('', jwtService)).toEqual({
      ok: false,
      error: 'missing',
    });
  });

  it('rejeita JWT inválido', () => {
    expect(authenticateWsToken('not-a-jwt', jwtService)).toEqual({
      ok: false,
      error: 'invalid',
    });
  });

  it('aceita JWT admin válido', () => {
    const token = jwtService.sign({ sub: 'admin-id', role: USER_ROLE.ADMIN });

    expect(authenticateWsToken(token, jwtService)).toEqual({
      ok: true,
      userId: 'admin-id',
      role: USER_ROLE.ADMIN,
    });
  });

  it('aceita JWT viewer válido', () => {
    const token = jwtService.sign({ sub: 'viewer-id', role: USER_ROLE.VIEWER });

    expect(authenticateWsToken(token, jwtService)).toEqual({
      ok: true,
      userId: 'viewer-id',
      role: USER_ROLE.VIEWER,
    });
  });
});
