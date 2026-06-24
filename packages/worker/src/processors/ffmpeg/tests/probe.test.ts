import { beforeEach, describe, expect, it, vi } from 'vitest';

import { probeVideo } from '../probe.ts';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

vi.mock('node:util', () => ({
  promisify: (fn: unknown) => fn,
}));

describe('probeVideo', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('parseia dimensões e duração do ffprobe', async () => {
    execFileMock.mockResolvedValue({
      stdout: JSON.stringify({
        streams: [{ width: 1280, height: 720, duration: '12.5' }],
        format: { duration: '12.5' },
      }),
      stderr: '',
    });

    await expect(probeVideo('/tmp/video.mp4')).resolves.toEqual({
      width: 1280,
      height: 720,
      durationSeconds: 12.5,
    });
  });

  it('lança quando dimensões estão ausentes', async () => {
    execFileMock.mockResolvedValue({
      stdout: JSON.stringify({ streams: [{}] }),
      stderr: '',
    });

    await expect(probeVideo('/tmp/video.mp4')).rejects.toThrow(/dimensões/);
  });
});
