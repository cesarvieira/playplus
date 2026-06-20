import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { env } from '../../config/env.js';
import { closeValkey } from '../valkey/client.js';

const sql = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(sql);

export async function pingDatabase(): Promise<void> {
  await sql`SELECT 1`;
}

export async function closeDatabase(): Promise<void> {
  await sql.end({ timeout: 5 });
}

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  process.stderr.write(`Encerrando pool PostgreSQL (${signal})...\n`);

  try {
    await closeDatabase();
    await closeValkey();
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Erro ao encerrar pool PostgreSQL: ${String(error)}\n`);
    process.exit(1);
  }
}

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
