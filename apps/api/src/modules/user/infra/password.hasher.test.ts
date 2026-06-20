import { hash } from '@node-rs/argon2';
import { describe, expect, it } from 'vitest';

import { verifyPassword } from './password.hasher.ts';

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

describe('verifyPassword', () => {
  it('retorna true para senha correta', async () => {
    const plain = 'seed-password-123';
    const passwordHash = await hash(plain, ARGON2_OPTIONS);

    await expect(verifyPassword(plain, passwordHash)).resolves.toBe(true);
  });

  it('retorna false para senha incorreta', async () => {
    const passwordHash = await hash('correct-password', ARGON2_OPTIONS);

    await expect(verifyPassword('wrong-password', passwordHash)).resolves.toBe(false);
  });
});
