import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageClient } from '../storage.client.ts';

const { sendMock, getSignedUrlMock, s3ClientConstructors } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
  s3ClientConstructors: [] as unknown[][],
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = sendMock;

    constructor(...args: unknown[]) {
      s3ClientConstructors.push(args);
    }
  },
  PutObjectCommand: class MockPutObjectCommand {
    input: unknown;
    type = 'PutObject';

    constructor(input: unknown) {
      this.input = input;
    }
  },
  HeadObjectCommand: class MockHeadObjectCommand {
    input: unknown;
    type = 'HeadObject';

    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}));

const config = {
  endpoint: 'http://localhost:9000',
  bucket: 'playplus',
  region: 'us-east-1',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
  defaultTtlSeconds: 3600,
};

describe('StorageClient', () => {
  beforeEach(() => {
    sendMock.mockReset();
    getSignedUrlMock.mockReset();
    s3ClientConstructors.length = 0;
  });

  it('getPresignedUploadUrl gera URL com TTL default', async () => {
    getSignedUrlMock.mockResolvedValue('https://storage/presigned-url');

    const client = new StorageClient(config);
    const url = await client.getPresignedUploadUrl('videos/id/original/file.mp4');

    const presignedClientConfig = s3ClientConstructors[0]?.[0] as Record<string, unknown>;

    expect(presignedClientConfig.requestChecksumCalculation).toBe('WHEN_REQUIRED');

    const command = getSignedUrlMock.mock.calls[0]?.[1] as { input: unknown; type: string };

    expect(command.type).toBe('PutObject');
    expect(command.input).toEqual({
      Bucket: 'playplus',
      Key: 'videos/id/original/file.mp4',
    });
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: 'PutObject' }),
      { expiresIn: 3600 },
    );
    expect(url).toBe('https://storage/presigned-url');
  });

  it('getPresignedUploadUrl aceita TTL customizado', async () => {
    getSignedUrlMock.mockResolvedValue('https://storage/presigned-url');

    const client = new StorageClient(config);
    await client.getPresignedUploadUrl('videos/id/original/file.mp4', 900);

    expect(getSignedUrlMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), {
      expiresIn: 900,
    });
  });

  it('objectExists retorna true quando objeto existe', async () => {
    sendMock.mockResolvedValue({});

    const client = new StorageClient(config);
    const exists = await client.objectExists('videos/id/original/file.mp4');

    const command = sendMock.mock.calls[0]?.[0] as { input: unknown; type: string };

    expect(command.type).toBe('HeadObject');
    expect(command.input).toEqual({
      Bucket: 'playplus',
      Key: 'videos/id/original/file.mp4',
    });
    expect(exists).toBe(true);
  });

  it('objectExists retorna false quando objeto não existe (NotFound)', async () => {
    sendMock.mockRejectedValue({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });

    const client = new StorageClient(config);
    const exists = await client.objectExists('videos/id/original/missing.mp4');

    expect(exists).toBe(false);
  });

  it('objectExists propaga erros que não são NotFound', async () => {
    sendMock.mockRejectedValue(new Error('Network failure'));

    const client = new StorageClient(config);

    await expect(client.objectExists('videos/id/original/file.mp4')).rejects.toThrow(
      'Network failure',
    );
  });
});
