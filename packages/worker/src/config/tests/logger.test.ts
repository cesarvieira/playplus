import { afterEach, describe, expect, it, vi } from 'vitest';

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('instancia logger padrão fora de development', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    const { logger } = await import('../logger.ts');

    expect(logger).toBeDefined();
    expect(() => logger.info({ videoId: '1' }, 'evento de teste')).not.toThrow();
  });

  it('instancia logger com pino-pretty em development', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const { logger } = await import('../logger.ts');

    expect(logger).toBeDefined();
    expect(() => logger.info({ videoId: '1' }, 'evento dev')).not.toThrow();
  });

  it('ignora mensagem vazia no hook de development', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const { logger } = await import('../logger.ts');

    expect(() => logger.info('')).not.toThrow();
  });

  it('reutiliza a mesma instância de logger', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    const first = await import('../logger.ts');
    const second = await import('../logger.ts');

    expect(first.logger).toBe(second.logger);
  });
});
