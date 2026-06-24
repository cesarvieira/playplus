import type { Redis } from 'ioredis';

import { getInfraLogger } from '#config/logger';

interface ConnectionErrorLike {
  code?: string;
  errors?: unknown[];
}

const ERROR_HANDLER_ATTACHED = Symbol('playplus.redis.errorHandlerAttached');
const DUPLICATE_PATCHED = Symbol('playplus.redis.duplicatePatched');

const CONNECTION_ERROR_LOG_INTERVAL_MS = 30_000;
let lastConnectionErrorLogAt = 0;

function getConnectionErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as ConnectionErrorLike;

  if (typeof candidate.code === 'string') {
    return candidate.code;
  }

  if (Array.isArray(candidate.errors)) {
    for (const nestedError of candidate.errors) {
      const nestedCode = getConnectionErrorCode(nestedError);

      if (nestedCode !== undefined) {
        return nestedCode;
      }
    }
  }

  return undefined;
}

export function logServiceConnectionError(
  error: unknown,
  serviceName: string,
  connectionUrl: string,
): void {
  logThrottledConnectionError(error, serviceName, connectionUrl);
}

function logThrottledConnectionError(
  error: unknown,
  serviceName: string,
  connectionUrl: string,
): void {
  const now = Date.now();

  if (now - lastConnectionErrorLogAt < CONNECTION_ERROR_LOG_INTERVAL_MS) {
    return;
  }

  lastConnectionErrorLogAt = now;
  getInfraLogger().error(formatServiceConnectionError(error, serviceName, connectionUrl));
}

export function formatConnectionTarget(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port || (parsed.protocol === 'redis:' ? '6379' : '');

    return port ? `${parsed.hostname}:${port}` : parsed.hostname;
  } catch {
    return url;
  }
}

export function formatServiceConnectionError(
  error: unknown,
  serviceName: string,
  connectionUrl: string,
): string {
  const target = formatConnectionTarget(connectionUrl);
  const code = getConnectionErrorCode(error);

  if (code === 'ECONNREFUSED') {
    return `${serviceName} indisponível em ${target} (conexão recusada). Inicie o serviço com: docker compose up -d ${serviceName.toLowerCase()}`;
  }

  if (code === 'ENOTFOUND') {
    return `${serviceName} indisponível: host de ${target} não encontrado. Verifique a URL de conexão no .env`;
  }

  if (code === 'ETIMEDOUT') {
    return `${serviceName} indisponível em ${target} (tempo de conexão esgotado)`;
  }

  if (error instanceof Error && error.message.length > 0) {
    return `${serviceName} indisponível em ${target}: ${error.message}`;
  }

  return `${serviceName} indisponível em ${target}`;
}

function attachRedisConnectionErrorHandler(
  redis: Redis,
  serviceName: string,
  connectionUrl: string,
): void {
  const markedRedis = redis as Redis & Record<symbol, boolean>;

  if (markedRedis[ERROR_HANDLER_ATTACHED]) {
    return;
  }

  markedRedis[ERROR_HANDLER_ATTACHED] = true;

  redis.on('error', (error) => {
    logThrottledConnectionError(error, serviceName, connectionUrl);
  });
}

function patchRedisDuplicate(redis: Redis, serviceName: string, connectionUrl: string): void {
  const markedRedis = redis as Redis & Record<symbol, boolean>;

  if (markedRedis[DUPLICATE_PATCHED]) {
    return;
  }

  markedRedis[DUPLICATE_PATCHED] = true;

  const originalDuplicate = redis.duplicate.bind(redis);

  redis.duplicate = (...args: Parameters<typeof originalDuplicate>) => {
    const duplicate = originalDuplicate(...args);
    configureRedisClient(duplicate, serviceName, connectionUrl);
    return duplicate;
  };
}

export function configureRedisClient(
  redis: Redis,
  serviceName: string,
  connectionUrl: string,
): void {
  attachRedisConnectionErrorHandler(redis, serviceName, connectionUrl);
  patchRedisDuplicate(redis, serviceName, connectionUrl);
}
