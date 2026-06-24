import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FfmpegProcessError } from '../errors.ts';
import { spawnFfmpeg } from '../ffmpeg-spawn.ts';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

function createMockChild(exitCode: number | null, options: { stdout?: string; stderr?: string } = {}) {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };

  child.stdout = stdout;
  child.stderr = stderr;

  queueMicrotask(() => {
    if (options.stdout) {
      stdout.emit('data', Buffer.from(options.stdout));
    }
    if (options.stderr) {
      stderr.emit('data', Buffer.from(options.stderr));
    }
    child.emit('close', exitCode);
  });

  return child;
}

describe('spawnFfmpeg', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('resolve e emite progresso com base em out_time_ms', async () => {
    const onProgress = vi.fn();
    spawnMock.mockReturnValue(
      createMockChild(0, {
        stdout: 'out_time_ms=50000\nprogress=continue\nout_time_ms=100000\n',
      }),
    );

    await spawnFfmpeg(['-i', 'input.mp4'], {
      durationMs: 100_000,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('rejeita com FfmpegProcessError quando exit code ≠ 0', async () => {
    spawnMock.mockReturnValue(createMockChild(1, { stderr: 'Invalid data found' }));

    let error: unknown;
    try {
      await spawnFfmpeg(['-i', 'bad.mp4'], { durationMs: 10_000 });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(FfmpegProcessError);
    expect(error).toMatchObject({
      exitCode: 1,
      message: 'ffmpeg_exit_code_1',
    });
  });
});
