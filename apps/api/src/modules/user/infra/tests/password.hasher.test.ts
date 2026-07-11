import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../password.hasher.ts';

describe('password.hasher', () => {
  it('verifyPassword retorna true para senha correta', async () => {
    const plain = 'seed-password-123';
    const passwordHash = await hashPassword(plain);

    await expect(verifyPassword(plain, passwordHash)).resolves.toBe(true);
  });

  it('verifyPassword retorna false para senha incorreta', async () => {
    const passwordHash = await hashPassword('correct-password');

    await expect(verifyPassword('wrong-password', passwordHash)).resolves.toBe(false);
  });
});
