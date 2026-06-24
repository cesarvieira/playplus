import postgres from 'postgres';

import { env } from '../config/env.ts';

let sql: postgres.Sql | null = null;

export function getSql(): postgres.Sql {
  if (!sql) {
    sql = postgres(env.DATABASE_URL, { max: 2 });
  }

  return sql;
}

export async function pingDatabase(): Promise<void> {
  await getSql()`SELECT 1`;
}

export async function closeDatabase(): Promise<void> {
  if (!sql) {
    return;
  }

  await sql.end({ timeout: 5 });
  sql = null;
}
