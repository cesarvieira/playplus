import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODE, RateLimitedError } from '@playplus/shared';

/**
 * Regressão: por padrão, o @fastify/rate-limit dá `throw` num Error puro
 * (sem `.code`, só `.statusCode = 429`) quando o limite estoura. O
 * errorHandlerPlugin deste projeto só reconhece erros com `.code` presente
 * em ERROR_CODE — qualquer outro erro cai no branch de 500 "Erro interno do
 * servidor" (ver resolveErrorResponse em error-handler.ts).
 *
 * Sem o `errorResponseBuilder` configurado em server.ts (retornando um
 * RateLimitedError, que TEM `.code = 'RATE_LIMITED'`), todo 429 de rate
 * limit vira silenciosamente um 500 — o cliente não recebe sinal nenhum de
 * "você está sendo limitado, tente de novo mais devagar", e o log de erro
 * fica poluído com entradas de "Erro interno não tratado" para tráfego que
 * é, na verdade, o rate limit funcionando exatamente como configurado.
 *
 * Este teste replica a configuração real de server.ts (rate-limit +
 * errorHandlerPlugin + errorResponseBuilder) pra garantir que o 429 chega
 * ao cliente como 429 — não como 500 — e com o corpo de erro padrão da API.
 */
describe('rate limit + errorHandlerPlugin — resposta de erro', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    const { default: errorHandlerPlugin } = await import('../error-handler.ts');

    app = Fastify();

    await app.register(rateLimit, {
      global: true,
      max: 1,
      timeWindow: '1 minute',
      errorResponseBuilder: () => new RateLimitedError(),
    });
    await errorHandlerPlugin(app);

    app.get('/probe', async () => ({ ok: true }));

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna 429 (não 500) com o corpo de erro padrão quando o limite estoura', async () => {
    const first = await app.inject({ method: 'GET', url: '/probe' });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({ method: 'GET', url: '/probe' });

    expect(second.statusCode).toBe(429);
    expect(second.json()).toEqual({
      error: {
        code: ERROR_CODE.RATE_LIMITED,
        message: expect.any(String),
      },
    });
  });

  it('inclui os headers padrão de rate limit na resposta 429', async () => {
    await app.inject({ method: 'GET', url: '/probe' });
    const second = await app.inject({ method: 'GET', url: '/probe' });

    expect(second.headers['retry-after']).toBeDefined();
    expect(second.headers['x-ratelimit-remaining']).toBe('0');
  });
});
