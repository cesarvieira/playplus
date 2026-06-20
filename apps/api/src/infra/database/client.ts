import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { env } from '#config/env';

const sql = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(sql);

export async function pingDatabase(): Promise<void> {
  await sql`SELECT 1`;
}

export async function closeDatabase(): Promise<void> {
  await sql.end({ timeout: 5 });
}
