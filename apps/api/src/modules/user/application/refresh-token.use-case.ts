import { randomUUID } from 'node:crypto';

import { InvalidTokenError } from '@playplus/shared';

import type { JwtService } from '../infra/jwt.service.ts';
import type { RefreshTokenStore } from '../infra/refresh-token.store.ts';
import type { UserRepository } from '../infra/user.repository.ts';

interface RefreshTokenResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  private readonly refreshTokenStore: RefreshTokenStore;
  private readonly userRepository: UserRepository;
  private readonly jwtService: JwtService;
  private readonly accessTtlSeconds: number;

  constructor(
    refreshTokenStore: RefreshTokenStore,
    userRepository: UserRepository,
    jwtService: JwtService,
    accessTtlSeconds: number,
  ) {
    this.refreshTokenStore = refreshTokenStore;
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.accessTtlSeconds = accessTtlSeconds;
  }

  async execute(refreshToken: string): Promise<RefreshTokenResult> {
    const record = await this.refreshTokenStore.get(refreshToken);

    if (!record) {
      throw new InvalidTokenError();
    }

    await this.refreshTokenStore.delete(refreshToken);

    const user = await this.userRepository.findById(record.userId);

    if (!user) {
      throw new InvalidTokenError();
    }

    const newRefreshToken = randomUUID();
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });

    await this.refreshTokenStore.save(newRefreshToken, { userId: user.id });

    return {
      accessToken,
      expiresIn: this.accessTtlSeconds,
      refreshToken: newRefreshToken,
    };
  }
}
