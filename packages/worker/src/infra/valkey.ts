import { Redis } from 'ioredis';

import { env } from '../config/env.ts';

let valkeyClient: Redis | null = null;

export function getValkeyClient(): Redis {
  if (!valkeyClient) {
    valkeyClient = new Redis(env.VALKEY_URL, {
      maxRetriesPerRequest: null,
    });
  }

  return valkeyClient;
}

export async function pingValkey(): Promise<void> {
  const client = getValkeyClient();
  const response = await client.ping();

  if (response !== 'PONG') {
    throw new Error(`Resposta inesperada do Valkey: ${response}`);
  }
}

export async function closeValkey(): Promise<void> {
  if (!valkeyClient || valkeyClient.status === 'end') {
    valkeyClient = null;
    return;
  }

  await valkeyClient.quit();
  valkeyClient = null;
}
