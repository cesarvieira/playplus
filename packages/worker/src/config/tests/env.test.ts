import { describe, expect, it } from 'vitest';

import { parseWorkerEnv, workerEnvSchema } from '../env.schema.ts';

const validEnv = {
  DATABASE_URL: 'postgresql://playplus:playplus@localhost:5432/playplus',
  VALKEY_URL: 'redis://localhost:6379',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_BUCKET: 'playplus',
  STORAGE_ACCESS_KEY: 'minioadmin',
  STORAGE_SECRET_KEY: 'minioadmin',
  STORAGE_REGION: 'us-east-1',
  NODE_ENV: 'development',
} as const;

describe('workerEnvSchema', () => {
  it('aceita variáveis válidas de desenvolvimento', () => {
    const result = workerEnvSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
  });

  it('rejeita DATABASE_URL sem prefixo postgresql://', () => {
    const result = workerEnvSchema.safeParse({
      ...validEnv,
      DATABASE_URL: 'mysql://localhost/playplus',
    });

    expect(result.success).toBe(false);
  });

  it('rejeita VALKEY_URL sem prefixo redis://', () => {
    const result = workerEnvSchema.safeParse({
      ...validEnv,
      VALKEY_URL: 'valkey://localhost:6379',
    });

    expect(result.success).toBe(false);
  });

  it('rejeita env incompleto', () => {
    const result = workerEnvSchema.safeParse({
      DATABASE_URL: validEnv.DATABASE_URL,
    });

    expect(result.success).toBe(false);
  });
});

describe('parseWorkerEnv', () => {
  it('retorna env parseado quando válido', () => {
    expect(parseWorkerEnv({ ...validEnv })).toEqual(validEnv);
  });

  it('lança erro descritivo quando inválido', () => {
    expect(() => parseWorkerEnv({})).toThrow(/Variáveis de ambiente inválidas ou ausentes/);
  });
});
