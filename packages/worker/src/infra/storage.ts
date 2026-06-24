import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

import { env } from '../config/env.ts';

let storageClient: S3Client | null = null;

function getStorageClient(): S3Client {
  if (!storageClient) {
    storageClient = new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }

  return storageClient;
}

export async function pingStorage(): Promise<void> {
  await getStorageClient().send(
    new HeadBucketCommand({
      Bucket: env.STORAGE_BUCKET,
    }),
  );
}
