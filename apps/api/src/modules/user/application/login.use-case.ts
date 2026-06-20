import { randomUUID } from 'node:crypto';

import type { JwtService } from '../infra/jwt.service.ts';
import { verifyPassword } from '../infra/password.hasher.ts';
import type { RefreshTokenStore } from '../infra/refresh-token.store.ts';
import type { UserRepository } from '../infra/user.repository.ts';
import { InvalidCredentialsError } from '../domain/invalid-credentials.error.ts';

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export class LoginUseCase {
  private readonly userRepository: UserRepository;
  private readonly jwtService: JwtService;
  private readonly refreshTokenStore: RefreshTokenStore;
  private readonly accessTtlSeconds: number;

  constructor(
    userRepository: UserRepository,
    jwtService: JwtService,
    refreshTokenStore: RefreshTokenStore,
    accessTtlSeconds: number,
  ) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.refreshTokenStore = refreshTokenStore;
    this.accessTtlSeconds = accessTtlSeconds;
  }

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || !(await user.verifyPassword(input.password, verifyPassword))) {
      throw new InvalidCredentialsError();
    }

    const refreshToken = randomUUID();
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });

    await this.refreshTokenStore.save(refreshToken, { userId: user.id });

    return {
      accessToken,
      expiresIn: this.accessTtlSeconds,
      refreshToken,
    };
  }
}
