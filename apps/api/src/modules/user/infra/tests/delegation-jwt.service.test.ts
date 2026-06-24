import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

import { DelegationJwtService } from '../delegation-jwt.service.ts';

const SECRET = 'delegation-secret-with-at-least-32-characters';

describe('DelegationJwtService', () => {
  let service: DelegationJwtService;

  beforeEach(() => {
    service = new DelegationJwtService({ secret: SECRET, ttlSeconds: 60 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('assina e verifica claim sub', () => {
    const token = service.sign('user-uuid-123');
    const payload = service.verify(token);

    expect(payload.sub).toBe('user-uuid-123');
    expect(payload.exp - payload.iat).toBe(60);
  });

  it('rejeita token assinado com secret diferente', () => {
    const other = new DelegationJwtService({
      secret: 'other-secret-with-at-least-32-characters',
      ttlSeconds: 60,
    });
    const token = other.sign('user-uuid-123');

    expect(() => service.verify(token)).toThrow();
  });

  it('rejeita token expirado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const token = service.sign('user-uuid-123');

    vi.setSystemTime(new Date('2026-01-01T00:02:00Z'));

    expect(() => service.verify(token)).toThrow();
  });

  it('rejeita payload sem sub', () => {
    const token = jwt.sign({}, SECRET, { algorithm: 'HS256', expiresIn: 60 });

    expect(() => service.verify(token)).toThrow();
  });
});
