import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '#infra/database/schema';
import { users } from '#infra/database/schema/users';

import { UserEntity } from '../domain/user.entity.ts';

type UserRow = typeof users.$inferSelect;

function mapRowToEntity(row: UserRow): UserEntity {
  return UserEntity.fromPersistence({
    id: row.id,
    email: row.email,
    role: row.role,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
  });
}

export class UserRepository {
  private readonly db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.db = db;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return mapRowToEntity(row);
  }
}
