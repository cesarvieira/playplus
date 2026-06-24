import { describe, expect, it } from 'vitest';

import { buildConnectSrc, createContentSecurityPolicy } from '../../../security-headers';

describe('security-headers', () => {
  it('inclui origens da API e WebSocket em connect-src', () => {
    const originalApi = process.env.NUXT_PUBLIC_API_URL;
    const originalWs = process.env.NUXT_PUBLIC_WS_URL;

    process.env.NUXT_PUBLIC_API_URL = 'https://api.playplus.localhost:3000/v1';
    process.env.NUXT_PUBLIC_WS_URL = 'wss://api.playplus.localhost:3000/ws';

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

  it('usa nonce em produção e unsafe-inline em dev', () => {
    const prod = createContentSecurityPolicy(false);
    const dev = createContentSecurityPolicy(true);

    expect(prod['script-src']).toContain('\'nonce-{{nonce}}\'');
    expect(prod['script-src']).toContain('\'strict-dynamic\'');
    expect(dev['script-src']).toContain('\'unsafe-inline\'');
    expect(dev['script-src']).not.toContain('\'nonce-{{nonce}}\'');
  });
});
