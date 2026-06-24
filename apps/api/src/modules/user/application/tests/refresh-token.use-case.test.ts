import { describe, expect, it, vi } from 'vitest';

import { InvalidTokenError, USER_ROLE } from '@playplus/shared';

import { UserEntity } from '#modules/user/domain/user.entity';
import type { JwtService } from '#modules/user/infra/jwt.service';
import type { RefreshTokenStore } from '#modules/user/infra/refresh-token.store';
import type { UserRepository } from '#modules/user/infra/user.repository';
import { RefreshTokenUseCase } from '../refresh-token.use-case.ts';

const user = UserEntity.fromPersistence({
  id: 'user-id',
  email: 'admin@playplus.localhost',
  role: USER_ROLE.ADMIN,
  passwordHash: '$argon2id$v=19$hashed',
  createdAt: new Date('2026-06-20T12:00:00.000Z'),
});

function createUseCase(overrides?: {
  refreshTokenStore?: Partial<RefreshTokenStore>;
  userRepository?: Partial<UserRepository>;
  jwtService?: Partial<JwtService>;
}) {
  const refreshTokenStore = {
    get: vi.fn().mockResolvedValue({ userId: 'user-id' }),
    delete: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides?.refreshTokenStore,
  } as RefreshTokenStore;

  const userRepository = {
    findById: vi.fn().mockResolvedValue(user),
    ...overrides?.userRepository,
  } as UserRepository;

  const jwtService = {
    sign: vi.fn().mockReturnValue('new-access-token'),
    ...overrides?.jwtService,
  } as JwtService;

  const useCase = new RefreshTokenUseCase(refreshTokenStore, userRepository, jwtService, 900);

  return { useCase, refreshTokenStore, userRepository, jwtService };
}

describe('RefreshTokenUseCase', () => {
  it('rotaciona refresh token: delete antes de save', async () => {
    const { useCase, refreshTokenStore, jwtService } = createUseCase();
    const callOrder: string[] = [];

    refreshTokenStore.delete = vi.fn().mockImplementation(async () => {
      callOrder.push('delete');
    });
    refreshTokenStore.save = vi.fn().mockImplementation(async () => {
      callOrder.push('save');
    });

    const result = await useCase.execute('old-refresh-token');

    expect(refreshTokenStore.get).toHaveBeenCalledWith('old-refresh-token');
    expect(refreshTokenStore.delete).toHaveBeenCalledWith('old-refresh-token');
    expect(refreshTokenStore.save).toHaveBeenCalledWith(result.refreshToken, { userId: 'user-id' });
    expect(callOrder).toEqual(['delete', 'save']);
    expect(result.accessToken).toBe('new-access-token');
    expect(result.expiresIn).toBe(900);
    expect(result.refreshToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-id', role: USER_ROLE.ADMIN });
  });

  it('lança InvalidTokenError quando token não existe no store', async () => {
    const { useCase } = createUseCase({
      refreshTokenStore: {
        get: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('invalid-token')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('lança InvalidTokenError quando usuário não existe', async () => {
    const { useCase } = createUseCase({
      userRepository: {
        findById: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('orphan-token')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('falha ao reutilizar token após rotation', async () => {
    const store = new Map<string, { userId: string }>();

    const refreshTokenStore = {
      get: vi.fn(async (tokenId: string) => store.get(tokenId) ?? null),
      delete: vi.fn(async (tokenId: string) => {
        store.delete(tokenId);
      }),
      save: vi.fn(async (tokenId: string, record: { userId: string }) => {
        store.set(tokenId, record);
      }),
    } as unknown as RefreshTokenStore;

    const useCase = new RefreshTokenUseCase(
      refreshTokenStore,
      {
        findById: vi.fn().mockResolvedValue(user),
        findByEmail: vi.fn(),
      } as unknown as UserRepository,
      { sign: vi.fn().mockReturnValue('access-token'), verify: vi.fn() } as unknown as JwtService,
      900,
    );

    store.set('token-1', { userId: 'user-id' });

    await useCase.execute('token-1');

    await expect(useCase.execute('token-1')).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
