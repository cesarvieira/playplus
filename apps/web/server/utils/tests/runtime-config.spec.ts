import { afterEach, describe, expect, it } from 'vitest';

import { getServerRuntimeConfig } from '../runtime-config';

describe('getServerRuntimeConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('lê variáveis de ambiente do servidor', () => {
    process.env.M2M_SERVICE_TOKEN = 'm2m-token';
    process.env.DELEGATION_JWT_SECRET = 'delegation-secret';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.DELEGATION_JWT_TTL_SECONDS = '120';
    process.env.NUXT_PUBLIC_API_URL = 'http://api.test/v1';
    process.env.NUXT_PUBLIC_WEB_URL = 'https://web.test';

    const config = getServerRuntimeConfig();

    expect(config).toEqual({
      m2mServiceToken: 'm2m-token',
      delegationJwtSecret: 'delegation-secret',
      jwtSecret: 'jwt-secret',
      delegationJwtTtlSeconds: 120,
      public: {
        apiUrl: 'http://api.test/v1',
        siteUrl: 'https://web.test',
      },
    });
  });

  it('usa defaults quando variáveis estão ausentes', () => {
    delete process.env.M2M_SERVICE_TOKEN;
    delete process.env.DELEGATION_JWT_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.DELEGATION_JWT_TTL_SECONDS;
    delete process.env.NUXT_PUBLIC_API_URL;
    delete process.env.NUXT_PUBLIC_WEB_URL;

    const config = getServerRuntimeConfig();

    expect(config.m2mServiceToken).toBe('');
    expect(config.delegationJwtSecret).toBe('');
    expect(config.jwtSecret).toBe('');
    expect(config.delegationJwtTtlSeconds).toBe(60);
    expect(config.public.apiUrl).toBe('http://localhost:3000/v1');
  });
});
