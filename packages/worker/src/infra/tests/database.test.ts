import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn().mockResolvedValue([]);
const end = vi.fn().mockResolvedValue(undefined);

function sqlTemplate(_strings: TemplateStringsArray, ..._values: unknown[]) {
  return query();
}

const sqlFn = Object.assign(sqlTemplate, { end });
const postgresMock = vi.fn(() => sqlFn);

vi.mock('postgres', () => ({
  default: postgresMock,
}));

vi.mock('../../config/env.ts', () => ({
  env: { DATABASE_URL: 'postgresql://playplus:playplus@localhost:5432/playplus' },
}));

describe('database', () => {
  beforeEach(() => {
    vi.resetModules();
    query.mockClear();
    end.mockClear();
    postgresMock.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('getSql reutiliza o mesmo cliente postgres', async () => {
    const { getSql } = await import('../database.ts');

    const first = getSql();
    const second = getSql();

    expect(first).toBe(second);
    expect(postgresMock).toHaveBeenCalledOnce();
    expect(postgresMock).toHaveBeenCalledWith(
      'postgresql://playplus:playplus@localhost:5432/playplus',
      { max: 2 },
    );
  });

  it('pingDatabase executa SELECT 1', async () => {
    const { pingDatabase } = await import('../database.ts');

    await pingDatabase();

    expect(query).toHaveBeenCalledOnce();
  });

  it('closeDatabase encerra conexão ativa', async () => {
    const { getSql, closeDatabase } = await import('../database.ts');

    getSql();
    await closeDatabase();

    expect(end).toHaveBeenCalledWith({ timeout: 5 });
  });

  it('closeDatabase é noop quando não há conexão', async () => {
    const { closeDatabase } = await import('../database.ts');

    await expect(closeDatabase()).resolves.toBeUndefined();
    expect(end).not.toHaveBeenCalled();
  });
});
