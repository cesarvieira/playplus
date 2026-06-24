import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';

const sendMock = vi.hoisted(() => vi.fn());
const pipelineMock = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock;
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

  return { S3Client, HeadBucketCommand, GetObjectCommand };
});

vi.mock('node:stream/promises', () => ({
  pipeline: pipelineMock,
}));

vi.mock('node:fs', () => ({
  createWriteStream: vi.fn(() => 'write-stream'),
}));

describe('downloadObject', () => {
  beforeEach(() => {
    sendMock.mockReset();
    pipelineMock.mockReset().mockResolvedValue(undefined);
    vi.resetModules();
  });

  it('baixa objeto do bucket para arquivo local', async () => {
    sendMock.mockResolvedValue({
      Body: Readable.from([Buffer.from('video-data')]),
    });

    const { downloadObject } = await import('../storage.ts');
    await downloadObject('videos/id/original/movie.mp4', '/tmp/movie.mp4');

    expect(sendMock).toHaveBeenCalledOnce();
    const command = sendMock.mock.calls[0]?.[0] as { type: string; input: unknown };
    expect(command.type).toBe('GetObject');
    expect(command.input).toEqual({
      Bucket: 'playplus',
      Key: 'videos/id/original/movie.mp4',
    });
    expect(pipelineMock).toHaveBeenCalled();
  });

  it('lança quando Body está ausente', async () => {
    sendMock.mockResolvedValue({ Body: undefined });

    const { downloadObject } = await import('../storage.ts');
    await expect(downloadObject('missing/key', '/tmp/file.mp4')).rejects.toThrow(/Objeto vazio/);
  });
});
