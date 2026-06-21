import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface StorageClientConfig {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  defaultTtlSeconds: number;
}

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
}
