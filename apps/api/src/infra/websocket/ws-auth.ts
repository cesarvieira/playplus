import type { UserRole } from '@playplus/shared';

import type { JwtService } from '#modules/user/infra/jwt.service';

type WsAuthError = 'missing' | 'invalid';

type WsAuthResult =
  { ok: true; userId: string; role: UserRole } |
  { ok: false; error: WsAuthError };

export function authenticateWsToken(token: unknown, jwtService: JwtService): WsAuthResult {
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, error: 'missing' };
  }

  try {
    const payload = jwtService.verify(token);
    return { ok: true, userId: payload.sub, role: payload.role };
  } catch {
    return { ok: false, error: 'invalid' };
  }
}
