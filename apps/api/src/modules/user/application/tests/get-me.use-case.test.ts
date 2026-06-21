import { describe, expect, it, vi } from 'vitest';

import { USER_ROLE, UserNotFoundError } from '@playplus/shared';

import { UserEntity } from '#modules/user/domain/user.entity';
import type { UserRepository } from '#modules/user/infra/user.repository';
import { GetMeUseCase } from '../get-me.use-case.ts';

const user = UserEntity.fromPersistence({
  id: 'user-id',
  email: 'viewer@playplus.local',
  role: USER_ROLE.VIEWER,
  passwordHash: '$argon2id$v=19$hashed',
  createdAt: new Date('2026-06-20T12:00:00.000Z'),
});

describe('GetMeUseCase', () => {
  it('retorna User quando usuário existe', async () => {
    const userRepository = {
      findById: vi.fn().mockResolvedValue(user),
      findByEmail: vi.fn(),
    } as unknown as UserRepository;

    const useCase = new GetMeUseCase(userRepository);
    const result = await useCase.execute({ userId: 'user-id' });

    expect(userRepository.findById).toHaveBeenCalledWith('user-id');
    expect(result).toEqual({
      id: 'user-id',
      email: 'viewer@playplus.local',
      role: USER_ROLE.VIEWER,
      createdAt: '2026-06-20T12:00:00.000Z',
    });
  });

  it('lança UserNotFoundError quando usuário não existe', async () => {
    const userRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn(),
    } as unknown as UserRepository;

    const useCase = new GetMeUseCase(userRepository);

    await expect(useCase.execute({ userId: 'missing-id' })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});
