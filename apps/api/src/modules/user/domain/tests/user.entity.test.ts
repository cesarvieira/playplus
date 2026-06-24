import { describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { UserEntity } from '../user.entity.ts';

const persistenceProps = {
  id: 'user-id',
  email: 'user@playplus.localhost',
  role: USER_ROLE.ADMIN,
  passwordHash: '$argon2id$v=19$hashed',
  createdAt: new Date('2026-06-20T12:00:00.000Z'),
};

describe('UserEntity', () => {
  it('preserva campos via fromPersistence', () => {
    const user = UserEntity.fromPersistence(persistenceProps);

    expect(user.id).toBe(persistenceProps.id);
    expect(user.email).toBe(persistenceProps.email);
    expect(user.role).toBe(persistenceProps.role);
    expect(user.createdAt).toBe(persistenceProps.createdAt);
  });

  it('toUser não expõe passwordHash', () => {
    const user = UserEntity.fromPersistence(persistenceProps);

    const publicUser = user.toUser();

    expect(publicUser).toEqual({
      id: persistenceProps.id,
      email: persistenceProps.email,
      role: persistenceProps.role,
      createdAt: persistenceProps.createdAt.toISOString(),
    });
    expect(publicUser).not.toHaveProperty('passwordHash');
  });

  it('verifyPassword repassa plain e hash ao verificador', async () => {
    const user = UserEntity.fromPersistence(persistenceProps);
    const verify = vi.fn().mockResolvedValue(true);

    const result = await user.verifyPassword('secret', verify);

    expect(result).toBe(true);
    expect(verify).toHaveBeenCalledWith('secret', persistenceProps.passwordHash);
  });
});
