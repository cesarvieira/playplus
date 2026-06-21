import { describe, expect, it, vi } from 'vitest';

import { RefreshTokenStore } from '../refresh-token.store.ts';

function createMockRedis() {
  const store = new Map<string, string>();

  return {
    set: vi.fn(async (key: string, value: string, ...args: string[]) => {
      store.set(key, value);
      void args;
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    del: vi.fn(async (key: string) => {
      const existed = store.delete(key);
      return existed ? 1 : 0;
    }),
    store,
  };
}

describe('RefreshTokenStore', () => {
  it('persiste e recupera registro com chave refresh:{tokenId}', async () => {
    const redis = createMockRedis();
    const store = new RefreshTokenStore(redis as never, 604800);

    await store.save('token-123', { userId: 'user-id' });

    expect(redis.set).toHaveBeenCalledWith(
      'refresh:token-123',
      JSON.stringify({ userId: 'user-id' }),
      'EX',
      604800,
    );

    const record = await store.get('token-123');

    expect(record).toEqual({ userId: 'user-id' });
  });

  it('retorna null quando a chave não existe', async () => {
    const redis = createMockRedis();
    const store = new RefreshTokenStore(redis as never, 604800);

    const record = await store.get('missing-token');

    expect(record).toBeNull();
  });

  it('remove a chave no delete', async () => {
    const redis = createMockRedis();
    const store = new RefreshTokenStore(redis as never, 604800);

    await store.save('token-123', { userId: 'user-id' });
    await store.delete('token-123');

    expect(redis.del).toHaveBeenCalledWith('refresh:token-123');
    expect(await store.get('token-123')).toBeNull();
  });
});
