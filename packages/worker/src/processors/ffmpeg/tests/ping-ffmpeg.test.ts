import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pingFfmpeg } from '../ping-ffmpeg.ts';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

vi.mock('node:util', () => ({
  promisify: (fn: unknown) => fn,
}));

describe('pingFfmpeg', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('resolve quando ffmpeg -version retorna saída válida', async () => {
    execFileMock.mockResolvedValue({ stdout: 'ffmpeg version 7.0', stderr: '' });

    await expect(pingFfmpeg('ffmpeg')).resolves.toBeUndefined();
    expect(execFileMock).toHaveBeenCalledWith(
      'ffmpeg',
      ['-version'],
      expect.objectContaining({ timeout: 5_000 }),
    );
  });

  it('lança erro descritivo quando binário não existe', async () => {
    const error = Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' });
    execFileMock.mockRejectedValue(error);

    await expect(pingFfmpeg('/missing/ffmpeg')).rejects.toThrow(/FFmpeg não encontrado/);
    await expect(pingFfmpeg('/missing/ffmpeg')).rejects.toThrow(/scoop install ffmpeg/);
  });
});
