import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hasSessionCookie } from '../session-cookie';

const getCookieMock = vi.hoisted(() => vi.fn());

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return {
    ...actual,
    getCookie: getCookieMock,
  };
});

const event = { node: { req: { headers: {} } } } as unknown as H3Event;

describe('hasSessionCookie', () => {
  beforeEach(() => {
    getCookieMock.mockReset();
  });

  it('retorna true quando access_token está presente', () => {
    getCookieMock.mockReturnValue('jwt');

    expect(hasSessionCookie(event)).toBe(true);
  });

  it('retorna false quando cookie está ausente', () => {
    getCookieMock.mockReturnValue(undefined);

    expect(hasSessionCookie(event)).toBe(false);
  });
});
