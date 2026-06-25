import { describe, expect, it } from 'vitest';

import {
  computeIsReconnecting,
  computeNextBackoffMs,
  MAX_BACKOFF_MS,
  shouldRefetchOnReconnectOpen,
} from '../useVideoStatusWs';

describe('computeNextBackoffMs', () => {
  it('dobra o backoff até o teto de 30s', () => {
    expect(computeNextBackoffMs(1000)).toBe(2000);
    expect(computeNextBackoffMs(16000)).toBe(30000);
    expect(computeNextBackoffMs(30000)).toBe(30000);
  });

  it('respeita teto customizado', () => {
    expect(computeNextBackoffMs(4000, 5000)).toBe(5000);
  });

  it('expõe teto padrão de 30s', () => {
    expect(MAX_BACKOFF_MS).toBe(30000);
  });
});

describe('shouldRefetchOnReconnectOpen', () => {
  it('refaz fetch apenas em reconexão', () => {
    expect(shouldRefetchOnReconnectOpen(false)).toBe(false);
    expect(shouldRefetchOnReconnectOpen(true)).toBe(true);
  });
});

describe('computeIsReconnecting', () => {
  it('não exibe banner antes da primeira conexão bem-sucedida', () => {
    expect(computeIsReconnecting(false, 'connecting')).toBe(false);
    expect(computeIsReconnecting(false, 'closed')).toBe(false);
  });

  it('exibe banner após queda de conexão', () => {
    expect(computeIsReconnecting(true, 'closed')).toBe(true);
    expect(computeIsReconnecting(true, 'connecting')).toBe(true);
    expect(computeIsReconnecting(true, 'open')).toBe(false);
  });
});
