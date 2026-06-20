import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { env } from '#config/env';

import * as schema from './schema.ts';

const sql = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(sql, { schema });

// export type UserRow = typeof schema.users.$inferSelect;

export async function pingDatabase(): Promise<void> {
  await sql`SELECT 1`;
}

export async function closeDatabase(): Promise<void> {
  await sql.end({ timeout: 5 });
}
