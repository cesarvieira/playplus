import { describe, expect, it } from 'vitest';

import { resolveVideoStatusWsUrl } from '../ws-url';

describe('resolveVideoStatusWsUrl', () => {
  const apiUrl = 'https://api.playplus.localhost:3000/v1';

  it('preserva URL já correta', () => {
    expect(resolveVideoStatusWsUrl(apiUrl, 'wss://api.playplus.localhost:3000/v1/ws')).toBe(
      'wss://api.playplus.localhost:3000/v1/ws',
    );
  });

  it('corrige env legado sem /v1', () => {
    expect(resolveVideoStatusWsUrl(apiUrl, 'wss://api.playplus.localhost:3000/ws')).toBe(
      'wss://api.playplus.localhost:3000/v1/ws',
    );
  });

  it('deriva da apiUrl quando wsUrl não termina em /ws', () => {
    expect(resolveVideoStatusWsUrl(apiUrl, '')).toBe('wss://api.playplus.localhost:3000/v1/ws');
    expect(resolveVideoStatusWsUrl('http://localhost:3000/v1', '')).toBe(
      'ws://localhost:3000/v1/ws',
    );
  });
});
