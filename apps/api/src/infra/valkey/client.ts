import Redis from 'ioredis';

import { env } from '../../config/env.js';

export const valkey = new Redis(env.VALKEY_URL, {
  maxRetriesPerRequest: null,
});

export async function pingValkey(): Promise<void> {
  const response = await valkey.ping();

  if (response !== 'PONG') {
    throw new Error(`Resposta inesperada do Valkey: ${response}`);
  }
}

export async function closeValkey(): Promise<void> {
  if (valkey.status === 'end') {
    return;
  }

  await valkey.quit();
}
