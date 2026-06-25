import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
      // MinIO does not handle SDK default flexible checksums (WHEN_SUPPORTED).
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
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

export function resolveHlsContentType(fileName: string): string {
  if (fileName.endsWith('.m3u8')) {
    return 'application/vnd.apple.mpegurl';
  }

  if (fileName.endsWith('.ts')) {
    return 'video/mp2t';
  }

  throw new Error(`Tipo de arquivo HLS não suportado: ${fileName}`);
}

function isHlsArtifact(fileName: string): boolean {
  return fileName.endsWith('.m3u8') || fileName.endsWith('.ts');
}

export async function uploadFile(key: string, filePath: string, contentType: string): Promise<void> {
  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType,
    }),
  );
}

async function collectHlsFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectHlsFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && isHlsArtifact(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

export async function uploadHlsDirectory(localDir: string, keyPrefix: string): Promise<void> {
  const normalizedPrefix = keyPrefix.endsWith('/') ? keyPrefix : `${keyPrefix}/`;
  const files = await collectHlsFiles(localDir);

  for (const filePath of files) {
    const relativePath = path.relative(localDir, filePath).replace(/\\/g, '/');
    const key = `${normalizedPrefix}${relativePath}`;
    const contentType = resolveHlsContentType(path.basename(filePath));

    await uploadFile(key, filePath, contentType);
  }
}
