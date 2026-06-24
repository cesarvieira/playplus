import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { GetObjectCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

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

export async function downloadObject(key: string, destPath: string): Promise<void> {
  const response = await getStorageClient().send(
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Objeto vazio no storage: ${key}`);
  }

  await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(destPath));
}
