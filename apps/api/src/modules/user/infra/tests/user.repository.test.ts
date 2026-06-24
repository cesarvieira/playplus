import { describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { UserEntity } from '#modules/user/domain/user.entity';
import { UserRepository } from '../user.repository.ts';

const userRow = {
  id: 'user-id',
  email: 'user@playplus.localhost',
  role: USER_ROLE.ADMIN,
  passwordHash: '$argon2id$v=19$hashed',
  createdAt: new Date('2026-06-20T12:00:00.000Z'),
};

function createMockDb(rows: (typeof userRow)[]) {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };

  const db = {
    select: vi.fn().mockReturnValue(selectChain),
  };

  return { db, selectChain };
}

describe('UserRepository', () => {
  it('retorna UserEntity quando o email existe', async () => {
    const { db, selectChain } = createMockDb([userRow]);
    const repository = new UserRepository(db as never);

    const result = await repository.findByEmail('user@playplus.localhost');

    expect(db.select).toHaveBeenCalled();
    expect(selectChain.from).toHaveBeenCalled();
    expect(selectChain.where).toHaveBeenCalled();
    expect(selectChain.limit).toHaveBeenCalledWith(1);
    expect(result).toBeInstanceOf(UserEntity);
    expect(result?.id).toBe(userRow.id);
    expect(result?.email).toBe(userRow.email);
    expect(result?.role).toBe(userRow.role);
    expect(result?.toUser()).not.toHaveProperty('passwordHash');
  });

  it('retorna null quando o email não existe', async () => {
    const { db } = createMockDb([]);
    const repository = new UserRepository(db as never);

    const result = await repository.findByEmail('missing@playplus.localhost');

    expect(result).toBeNull();
  });
});
