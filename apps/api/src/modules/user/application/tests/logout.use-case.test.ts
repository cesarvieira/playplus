import { describe, expect, it, vi } from 'vitest';

import type { RefreshTokenStore } from '#modules/user/infra/refresh-token.store';
import { LogoutUseCase } from '../logout.use-case.ts';

function createUseCase(refreshTokenStore?: Partial<RefreshTokenStore>) {
  const store = {
    delete: vi.fn().mockResolvedValue(undefined),
    ...refreshTokenStore,
  } as RefreshTokenStore;

  return { useCase: new LogoutUseCase(store), store };
}

describe('LogoutUseCase', () => {
  it('remove refresh token do store quando presente', async () => {
    const { useCase, store } = createUseCase();

    await useCase.execute('refresh-token-123');

    expect(store.delete).toHaveBeenCalledWith('refresh-token-123');
  });

  it('é idempotente quando token ausente', async () => {
    const { useCase, store } = createUseCase();

    await useCase.execute(undefined);

    expect(store.delete).not.toHaveBeenCalled();
  });

  it('não lança erro quando token já foi removido', async () => {
    const { useCase, store } = createUseCase();

    await expect(useCase.execute('already-gone')).resolves.toBeUndefined();
    expect(store.delete).toHaveBeenCalledWith('already-gone');
  });
});
