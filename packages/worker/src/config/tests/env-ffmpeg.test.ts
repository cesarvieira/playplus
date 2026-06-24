import { describe, expect, it } from 'vitest';

import { env } from '../env.ts';
import { workerEnvSchema } from '../env.schema.ts';

const baseEnv = {
  DATABASE_URL: 'postgresql://playplus:playplus@localhost:5432/playplus',
  VALKEY_URL: 'redis://localhost:6379',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_BUCKET: 'playplus',
  STORAGE_ACCESS_KEY: 'minioadmin',
  STORAGE_SECRET_KEY: 'minioadmin',
  STORAGE_REGION: 'us-east-1',
  NODE_ENV: 'development',
} as const;

describe('workerEnvSchema — FFMPEG_PATH', () => {
  it('aceita env sem FFMPEG_PATH', () => {
    const result = workerEnvSchema.safeParse(baseEnv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.FFMPEG_PATH).toBeUndefined();
    }
  });

  it('aceita caminho absoluto customizado', () => {
    const result = workerEnvSchema.safeParse({
      ...baseEnv,
      FFMPEG_PATH: 'C:\\tools\\ffmpeg.exe',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.FFMPEG_PATH).toBe('C:\\tools\\ffmpeg.exe');
    }
  });
});

describe('env — FFMPEG_PATH default', () => {
  it('usa ffmpeg quando FFMPEG_PATH não está definido', () => {
    expect(env.FFMPEG_PATH).toBe('ffmpeg');
  });
});
