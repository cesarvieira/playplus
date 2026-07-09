import { describe, expect, it } from 'vitest';

import { buildConnectSrc, createContentSecurityPolicy } from '../../../security-headers';

describe('security-headers', () => {
  it('inclui origens da API e WebSocket em connect-src', () => {
    const originalApi = process.env.NUXT_PUBLIC_API_URL;
    const originalWs = process.env.NUXT_PUBLIC_WS_URL;

    process.env.NUXT_PUBLIC_API_URL = 'https://api.playplus.localhost/v1';
    process.env.NUXT_PUBLIC_WS_URL = 'wss://api.playplus.localhost/v1/ws';

    expect(buildConnectSrc(false)).toEqual(
      expect.arrayContaining([
        '\'self\'',
        'https://api.playplus.localhost',
        'wss://api.playplus.localhost',
      ]),
    );

    process.env.NUXT_PUBLIC_API_URL = originalApi;
    process.env.NUXT_PUBLIC_WS_URL = originalWs;
  });

  it('inclui origem do storage em connect-src', () => {
    const originalStorage = process.env.STORAGE_ENDPOINT;

    process.env.STORAGE_ENDPOINT = 'https://storage.playplus.localhost';

    expect(buildConnectSrc(false)).toEqual(
      expect.arrayContaining([
        'https://storage.playplus.localhost',
      ]),
    );

    expect(buildConnectSrc(true)).toEqual(
      expect.arrayContaining([
        'https://storage.playplus.localhost',
        'wss://admin.playplus.localhost',
      ]),
    );

    process.env.STORAGE_ENDPOINT = originalStorage;
  });

  it('não inclui mais origens do antigo modo HTTP rápido em dev', () => {
    expect(buildConnectSrc(true)).toEqual(
      expect.not.arrayContaining([
        'http://localhost:9000',
        'ws://localhost:3002',
        'http://localhost:3000',
        'ws://localhost:3000',
      ]),
    );
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
