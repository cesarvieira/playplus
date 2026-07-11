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
  ListObjectsV2Command: class MockListObjectsV2Command {
    input: unknown;
    type = 'ListObjectsV2';

    constructor(input: unknown) {
      this.input = input;
    }
  },
  DeleteObjectsCommand: class MockDeleteObjectsCommand {
    input: unknown;
    type = 'DeleteObjects';

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

  it('listObjectKeys retorna keys paginadas sob o prefixo', async () => {
    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Key: 'videos/id/original/file.mp4' }],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'videos/id/hls/master.m3u8' }],
        IsTruncated: false,
      });

    const client = new StorageClient(config);
    const keys = await client.listObjectKeys('videos/id/');

    expect(keys).toEqual(['videos/id/original/file.mp4', 'videos/id/hls/master.m3u8']);

    const firstCommand = sendMock.mock.calls[0]?.[0] as { input: unknown; type: string };
    const secondCommand = sendMock.mock.calls[1]?.[0] as { input: unknown; type: string };

    expect(firstCommand.type).toBe('ListObjectsV2');
    expect(firstCommand.input).toEqual({
      Bucket: 'playplus',
      Prefix: 'videos/id/',
      ContinuationToken: undefined,
    });
    expect(secondCommand.input).toEqual({
      Bucket: 'playplus',
      Prefix: 'videos/id/',
      ContinuationToken: 'page-2',
    });
  });

  it('deleteObjects remove lotes de até 1000 keys', async () => {
    sendMock.mockResolvedValue({});

    const client = new StorageClient(config);
    const keys = ['videos/id/a.ts', 'videos/id/b.ts'];

    await client.deleteObjects(keys);

    const command = sendMock.mock.calls[0]?.[0] as { input: unknown; type: string };

    expect(command.type).toBe('DeleteObjects');
    expect(command.input).toEqual({
      Bucket: 'playplus',
      Delete: {
        Objects: [{ Key: 'videos/id/a.ts' }, { Key: 'videos/id/b.ts' }],
        Quiet: true,
      },
    });
  });

  it('deleteObjects é no-op para lista vazia', async () => {
    const client = new StorageClient(config);

    await client.deleteObjects([]);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('deleteByPrefix lista e remove objetos do prefixo', async () => {
    sendMock
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'videos/id/original/file.mp4' },
          { Key: 'videos/id/hls/master.m3u8' },
        ],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});

    const client = new StorageClient(config);
    await client.deleteByPrefix('videos/id/');

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({ type: 'ListObjectsV2' });
    expect(sendMock.mock.calls[1]?.[0]).toMatchObject({ type: 'DeleteObjects' });
  });

  it('deleteByPrefix ignora prefixo vazio', async () => {
    const client = new StorageClient(config);

    await client.deleteByPrefix('');

    expect(sendMock).not.toHaveBeenCalled();
  });
});
