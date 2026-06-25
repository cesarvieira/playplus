import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());
const readdirMock = vi.hoisted(() => vi.fn());
const createReadStreamMock = vi.hoisted(() => vi.fn());
const s3ClientConstructors = vi.hoisted(() => [] as unknown[][]);

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock;

    constructor(...args: unknown[]) {
      s3ClientConstructors.push(args);
    }
  }

  class HeadBucketCommand {
    type = 'HeadBucket';
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class GetObjectCommand {
    type = 'GetObject';
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class PutObjectCommand {
    type = 'PutObject';
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return { S3Client, HeadBucketCommand, GetObjectCommand, PutObjectCommand };
});

vi.mock('node:fs/promises', () => ({
  readdir: readdirMock,
}));

vi.mock('node:fs', () => ({
  createReadStream: createReadStreamMock,
  createWriteStream: vi.fn(() => 'write-stream'),
}));

vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

describe('resolveHlsContentType', () => {
  beforeEach(() => {
    vi.resetModules();
    s3ClientConstructors.length = 0;
  });

  it('resolve content-type para playlists e segmentos', async () => {
    const { resolveHlsContentType } = await import('../storage.ts');

    expect(resolveHlsContentType('master.m3u8')).toBe('application/vnd.apple.mpegurl');
    expect(resolveHlsContentType('seg000.ts')).toBe('video/mp2t');
  });

  it('rejeita extensões não suportadas', async () => {
    const { resolveHlsContentType } = await import('../storage.ts');

    expect(() => resolveHlsContentType('notes.txt')).toThrow(/não suportado/);
  });
});

describe('uploadFile', () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue(undefined);
    createReadStreamMock.mockReset().mockReturnValue('read-stream');
    s3ClientConstructors.length = 0;
    vi.resetModules();
  });

  it('configura S3Client sem checksum flexível (compatível com MinIO)', async () => {
    const { uploadFile } = await import('../storage.ts');

    await uploadFile('videos/id/hls/master.m3u8', '/tmp/master.m3u8', 'application/vnd.apple.mpegurl');

    const clientConfig = s3ClientConstructors[0]?.[0] as Record<string, unknown>;

    expect(clientConfig.requestChecksumCalculation).toBe('WHEN_REQUIRED');
    expect(clientConfig.responseChecksumValidation).toBe('WHEN_REQUIRED');
    expect(clientConfig.forcePathStyle).toBe(true);
  });

  it('envia PutObject com key, body e content-type', async () => {
    const { uploadFile } = await import('../storage.ts');

    await uploadFile('videos/id/hls/master.m3u8', '/tmp/master.m3u8', 'application/vnd.apple.mpegurl');

    expect(createReadStreamMock).toHaveBeenCalledWith('/tmp/master.m3u8');
    expect(sendMock).toHaveBeenCalledOnce();

    const command = sendMock.mock.calls[0]?.[0] as { type: string; input: unknown };
    expect(command.type).toBe('PutObject');
    expect(command.input).toEqual({
      Bucket: 'playplus',
      Key: 'videos/id/hls/master.m3u8',
      Body: 'read-stream',
      ContentType: 'application/vnd.apple.mpegurl',
    });
  });
});

describe('uploadHlsDirectory', () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue(undefined);
    createReadStreamMock.mockReset().mockReturnValue('read-stream');
    readdirMock.mockReset();
    s3ClientConstructors.length = 0;
    vi.resetModules();
  });

  it('faz upload recursivo apenas de .m3u8 e .ts', async () => {
    readdirMock
      .mockResolvedValueOnce([
        { name: 'master.m3u8', isDirectory: () => false, isFile: () => true },
        { name: '240p', isDirectory: () => true, isFile: () => false },
        { name: '.DS_Store', isDirectory: () => false, isFile: () => true },
      ])
      .mockResolvedValueOnce([
        { name: 'index.m3u8', isDirectory: () => false, isFile: () => true },
        { name: 'seg000.ts', isDirectory: () => false, isFile: () => true },
      ]);

    const { uploadHlsDirectory } = await import('../storage.ts');
    await uploadHlsDirectory('/tmp/hls', 'videos/id/hls/');

    expect(sendMock).toHaveBeenCalledTimes(3);

    const keys = sendMock.mock.calls.map(
      call => (call[0] as { input: { Key: string } }).input.Key,
    );

    expect(keys).toEqual([
      'videos/id/hls/master.m3u8',
      'videos/id/hls/240p/index.m3u8',
      'videos/id/hls/240p/seg000.ts',
    ]);
  });

  it('propaga erro de upload para permitir retry do job', async () => {
    readdirMock.mockResolvedValueOnce([
      { name: 'master.m3u8', isDirectory: () => false, isFile: () => true },
    ]);
    sendMock.mockRejectedValueOnce(new Error('storage indisponível'));

    const { uploadHlsDirectory } = await import('../storage.ts');

    await expect(uploadHlsDirectory('/tmp/hls', 'videos/id/hls/')).rejects.toThrow(
      'storage indisponível',
    );
  });
});
