import { describe, expect, it, vi } from 'vitest';

import { USER_ROLE } from '@playplus/shared';

import { seedAdminUser } from '../admin-user.ts';

function createMockDb(existingEmail: boolean) {
  const insert = vi.fn().mockResolvedValue(undefined);
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(existingEmail ? [{ id: 'existing-id' }] : []),
  };

  const db = {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue({ values: insert }),
  };

  return { db, insert };
}

describe('seedAdminUser', () => {
  it('não insere quando o email já existe', async () => {
    const hashPassword = vi.fn();
    const { db, insert } = createMockDb(true);

    const result = await seedAdminUser(
      db as never,
      { email: 'admin@playplus.localhost', password: 'secret' },
      hashPassword,
    );

    expect(result).toBe('skipped');
    expect(hashPassword).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('hasheia a senha e insere admin quando o email não existe', async () => {
    const hashPassword = vi.fn().mockResolvedValue('$argon2id$v=19$hashed');
    const { db, insert } = createMockDb(false);

    const result = await seedAdminUser(
      db as never,
      { email: 'admin@playplus.localhost', password: 'secret' },
      hashPassword,
    );

    expect(result).toBe('created');
    expect(hashPassword).toHaveBeenCalledWith('secret');
    expect(insert).toHaveBeenCalledWith({
      email: 'admin@playplus.localhost',
      passwordHash: '$argon2id$v=19$hashed',
      role: USER_ROLE.ADMIN,
    });
  });
});
