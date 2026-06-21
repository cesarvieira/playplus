import { describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { InvalidCredentialsError } from '#modules/user/domain/invalid-credentials.error';
import { UserEntity } from '#modules/user/domain/user.entity';
import type { JwtService } from '#modules/user/infra/jwt.service';
import type { RefreshTokenStore } from '#modules/user/infra/refresh-token.store';
import type { UserRepository } from '#modules/user/infra/user.repository';
import { LoginUseCase } from '../login.use-case.ts';

const user = UserEntity.fromPersistence({
  id: 'user-id',
  email: 'admin@playplus.local',
  role: USER_ROLE.ADMIN,
  passwordHash: '$argon2id$v=19$hashed',
  createdAt: new Date('2026-06-20T12:00:00.000Z'),
});

function createUseCase(overrides?: {
  userRepository?: Partial<UserRepository>;
  jwtService?: Partial<JwtService>;
  refreshTokenStore?: Partial<RefreshTokenStore>;
}) {
  const userRepository = {
    findByEmail: vi.fn().mockResolvedValue(user),
    ...overrides?.userRepository,
  } as UserRepository;

  const jwtService = {
    sign: vi.fn().mockReturnValue('access-token'),
    ...overrides?.jwtService,
  } as JwtService;

  const refreshTokenStore = {
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides?.refreshTokenStore,
  } as RefreshTokenStore;

  const useCase = new LoginUseCase(userRepository, jwtService, refreshTokenStore, 900);

  return { useCase, userRepository, jwtService, refreshTokenStore };
}

describe('LoginUseCase', () => {
  it('retorna tokens e persiste refresh no store', async () => {
    vi.spyOn(user, 'verifyPassword').mockResolvedValue(true);

    const { useCase, jwtService, refreshTokenStore } = createUseCase();

    const result = await useCase.execute({
      email: 'admin@playplus.local',
      password: 'correct-password',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.expiresIn).toBe(900);
    expect(result.refreshToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-id', role: USER_ROLE.ADMIN });
    expect(refreshTokenStore.save).toHaveBeenCalledWith(result.refreshToken, {
      userId: 'user-id',
    });
  });

  it('lança InvalidCredentialsError quando email não existe', async () => {
    const { useCase } = createUseCase({
      userRepository: {
        findByEmail: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute({ email: 'missing@playplus.local', password: 'password123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('lança InvalidCredentialsError quando senha está incorreta', async () => {
    vi.spyOn(user, 'verifyPassword').mockResolvedValue(false);

    const { useCase } = createUseCase();

    await expect(
      useCase.execute({ email: 'admin@playplus.local', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
