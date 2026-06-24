import { Redis } from 'ioredis';

import { env } from '#config/env';
import { configureRedisClient, formatServiceConnectionError } from '#infra/connection-error';

const VALKEY_SERVICE_NAME = 'Valkey';

function createValkeyClient(): Redis {
  const client = new Redis(env.VALKEY_URL, {
    maxRetriesPerRequest: null,
  });

  configureRedisClient(client, VALKEY_SERVICE_NAME, env.VALKEY_URL);

  return client;
}

export const valkey = createValkeyClient();

export async function pingValkey(): Promise<void> {
  try {
    const response = await valkey.ping();

    if (response !== 'PONG') {
      throw new Error(`Resposta inesperada do Valkey: ${response}`);
    }
  } catch (error) {
    throw new Error(formatServiceConnectionError(error, VALKEY_SERVICE_NAME, env.VALKEY_URL), {
      cause: error,
    });
  }
}

export async function closeValkey(): Promise<void> {
  if (valkey.status === 'end') {
    return;
  }

  await valkey.quit();
}
