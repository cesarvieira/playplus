import { describe, expect, it } from 'vitest';

import {
  getDisplayNameFromEmail,
  getInitialFromEmail,
  isUnauthorizedError,
  isValidRedirect,
  mapAuthResponse,
  mapMeResponse,
  parseApiError,
  resolvePostLoginRedirect,
} from '../auth';

describe('mapAuthResponse', () => {
  it('maps snake_case API response to camelCase', () => {
    expect(mapAuthResponse({ access_token: 'tok', expires_in: 900 })).toEqual({
      accessToken: 'tok',
      expiresIn: 900,
    });
  });
});

describe('mapMeResponse', () => {
  it('maps snake_case user fields', () => {
    expect(
      mapMeResponse({
        id: 'uuid',
        email: 'admin@playplus.localhost',
        role: 'admin',
        created_at: '2025-01-01T00:00:00Z',
      }),
    ).toEqual({
      id: 'uuid',
      email: 'admin@playplus.localhost',
      role: 'admin',
      createdAt: '2025-01-01T00:00:00Z',
    });
  });
});

describe('isValidRedirect', () => {
  it('accepts internal paths', () => {
    expect(isValidRedirect('/videos')).toBe(true);
    expect(isValidRedirect('/videos/new')).toBe(true);
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(isValidRedirect('//evil.com')).toBe(false);
    expect(isValidRedirect('https://evil.com')).toBe(false);
    expect(isValidRedirect('/\\evil.com')).toBe(false);
  });
});

describe('resolvePostLoginRedirect', () => {
  it('returns default path when redirect is absent', () => {
    expect(resolvePostLoginRedirect({})).toBe('/videos');
  });

  it('returns valid internal redirect', () => {
    expect(resolvePostLoginRedirect({ redirect: '/videos/new' })).toBe('/videos/new');
  });

  it('ignores invalid redirect values', () => {
    expect(resolvePostLoginRedirect({ redirect: '//evil.com' })).toBe('/videos');
  });
});

describe('getInitialFromEmail', () => {
  it('returns uppercase first letter', () => {
    expect(getInitialFromEmail('admin@playplus.localhost')).toBe('A');
  });

  it('returns fallback for empty email', () => {
    expect(getInitialFromEmail('')).toBe('?');
  });
});

describe('getDisplayNameFromEmail', () => {
  it('capitalizes the local part of the email', () => {
    expect(getDisplayNameFromEmail('admin@playplus.local')).toBe('Admin');
    expect(getDisplayNameFromEmail('rafael@playplus.local')).toBe('Rafael');
  });

  it('returns fallback for empty email', () => {
    expect(getDisplayNameFromEmail('')).toBe('Admin');
  });
});

describe('parseApiError', () => {
  it('extracts API error body from fetch error', () => {
    const error = {
      data: {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credenciais inválidas',
        },
      },
    };

    expect(parseApiError(error)).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Credenciais inválidas',
    });
  });

  it('returns null for non-api errors', () => {
    expect(parseApiError(new Error('fail'))).toBeNull();
  });
});

describe('isUnauthorizedError', () => {
  it('detects 401 fetch errors', () => {
    expect(isUnauthorizedError({ statusCode: 401 })).toBe(true);
    expect(isUnauthorizedError({ statusCode: 500 })).toBe(false);
  });
});
