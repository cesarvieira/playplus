import type { RefreshTokenStore } from '../infra/refresh-token.store.ts';

export class LogoutUseCase {
  private readonly refreshTokenStore: RefreshTokenStore;

  constructor(refreshTokenStore: RefreshTokenStore) {
    this.refreshTokenStore = refreshTokenStore;
  }

  async execute(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.refreshTokenStore.delete(refreshToken);
  }
}
