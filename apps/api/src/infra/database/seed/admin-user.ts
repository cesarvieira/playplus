import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { USER_ROLE } from '@playplus/shared';

import type * as schema from '../schema.ts';
import { users } from '../schema/users.ts';

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

type SeedAdminUserResult = 'created' | 'skipped';

type HashPasswordFn = (password: string) => Promise<string>;

export async function seedAdminUser(
  db: PostgresJsDatabase<typeof schema>,
  input: { email: string; password: string },
  hashPassword: HashPasswordFn = (password) => hash(password, ARGON2_OPTIONS),
): Promise<SeedAdminUserResult> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    return 'skipped';
  }

  const passwordHash = await hashPassword(input.password);

  await db.insert(users).values({
    email: input.email,
    passwordHash,
    role: USER_ROLE.ADMIN,
  });

  return 'created';
}
