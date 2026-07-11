import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface StorageClientConfig {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  defaultTtlSeconds: number;
}

const DELETE_BATCH_SIZE = 1000;

function isNotFoundError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }

  const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };

  return err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404;
}

export class StorageClient {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly defaultTtlSeconds: number;

  constructor(config: StorageClientConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
      // Browser uploads via presigned PUT cannot send SDK checksum headers.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    this.bucket = config.bucket;
    this.defaultTtlSeconds = config.defaultTtlSeconds;
  }

  async getPresignedUploadUrl(key: string, ttlSeconds?: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: ttlSeconds ?? this.defaultTtlSeconds,
    });
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  async listObjectKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of response.Contents ?? []) {
        if (object.Key) {
          keys.push(object.Key);
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return keys;
  }

  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    for (let offset = 0; offset < keys.length; offset += DELETE_BATCH_SIZE) {
      const batch = keys.slice(offset, offset + DELETE_BATCH_SIZE);

      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    if (!prefix) {
      return;
    }

    const keys = await this.listObjectKeys(prefix);
    await this.deleteObjects(keys);
  }
}
