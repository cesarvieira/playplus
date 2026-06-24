import { afterEach, describe, expect, it, vi } from 'vitest';

describe('env module', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('encerra processo quando variáveis de ambiente são inválidas', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('VALKEY_URL', '');
    vi.stubEnv('STORAGE_ENDPOINT', '');
    vi.stubEnv('STORAGE_BUCKET', '');
    vi.stubEnv('STORAGE_ACCESS_KEY', '');
    vi.stubEnv('STORAGE_SECRET_KEY', '');
    vi.stubEnv('STORAGE_REGION', '');
    vi.stubEnv('NODE_ENV', 'test');

    await import('../env.ts');

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Variáveis de ambiente inválidas'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('escreve mensagem genérica quando o erro não é instância de Error', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    vi.doMock('../env.schema.ts', () => ({
      parseWorkerEnv: () => {
        throw 'falha opaca';
      },
    }));

    await import('../env.ts');

    expect(stderrSpy).toHaveBeenCalledWith('falha opaca\n');
    expect(exitSpy).toHaveBeenCalledWith(1);

    vi.doUnmock('../env.schema.ts');
  });
});
