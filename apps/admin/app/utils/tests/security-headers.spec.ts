import { describe, expect, it } from 'vitest';

import { buildConnectSrc, createContentSecurityPolicy } from '../../../security-headers';

describe('security-headers', () => {
  it('inclui origens da API e WebSocket em connect-src', () => {
    const originalApi = process.env.NUXT_PUBLIC_API_URL;
    const originalWs = process.env.NUXT_PUBLIC_WS_URL;

    process.env.NUXT_PUBLIC_API_URL = 'https://api.playplus.localhost:3000/v1';
    process.env.NUXT_PUBLIC_WS_URL = 'wss://api.playplus.localhost:3000/v1/ws';

    expect(buildConnectSrc(false)).toEqual(
      expect.arrayContaining([
        '\'self\'',
        'https://api.playplus.localhost:3000',
        'wss://api.playplus.localhost:3000',
      ]),
    );

    process.env.NUXT_PUBLIC_API_URL = originalApi;
    process.env.NUXT_PUBLIC_WS_URL = originalWs;
  });

  it('inclui origem do storage em connect-src', () => {
    const originalStorage = process.env.STORAGE_ENDPOINT;

    process.env.STORAGE_ENDPOINT = 'https://storage.playplus.localhost:9000';

    expect(buildConnectSrc(false)).toEqual(
      expect.arrayContaining([
        'https://storage.playplus.localhost:9000',
      ]),
    );

    expect(buildConnectSrc(true)).toEqual(
      expect.arrayContaining([
        'http://localhost:9000',
        'https://storage.playplus.localhost:9000',
        'wss://admin.playplus.localhost:3001',
      ]),
    );

    process.env.STORAGE_ENDPOINT = originalStorage;
  });

  it('usa nonce em produção e unsafe-inline em dev', () => {
    const prod = createContentSecurityPolicy(false);
    const dev = createContentSecurityPolicy(true);

    expect(prod['script-src']).toContain('\'nonce-{{nonce}}\'');
    expect(prod['script-src']).toContain('\'strict-dynamic\'');
    expect(dev['script-src']).toContain('\'unsafe-inline\'');
    expect(dev['script-src']).not.toContain('\'nonce-{{nonce}}\'');
  });
});
