import { env } from '#config/env';

import { StorageClient } from './storage.client.ts';

export function createStorageClient(): StorageClient {
  return new StorageClient({
    endpoint: env.STORAGE_ENDPOINT,
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION,
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
    defaultTtlSeconds: env.PRESIGNED_UPLOAD_TTL_SECONDS,
  });
}
