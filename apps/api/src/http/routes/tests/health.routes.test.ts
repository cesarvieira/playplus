import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEALTH_CHECK_STATUS, HEALTH_STATUS } from '@playplus/shared';
import healthRoutes from '../health.routes.ts';

const { pingDatabase, pingValkey } = vi.hoisted(() => ({
  pingDatabase: vi.fn<() => Promise<void>>(),
  pingValkey: vi.fn<() => Promise<void>>(),
}));

vi.mock('#infra/database/client', () => ({
  pingDatabase,
}));

vi.mock('#infra/valkey/client', () => ({
  pingValkey,
}));

describe('GET /v1/health', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    pingDatabase.mockReset();
    pingValkey.mockReset();

    app = Fastify();
    await app.register(healthRoutes, { prefix: '/v1' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna 200 quando postgres e valkey estão ok', async () => {
    pingDatabase.mockResolvedValue(undefined);
    pingValkey.mockResolvedValue(undefined);

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.status).toBe(HEALTH_STATUS.OK);
    expect(body.checks).toEqual({
      database: HEALTH_CHECK_STATUS.OK,
      valkey: HEALTH_CHECK_STATUS.OK,
    });
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('retorna 503 quando database falha', async () => {
    pingDatabase.mockRejectedValue(new Error('connection refused'));
    pingValkey.mockResolvedValue(undefined);

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(503);

    const body = response.json();

    expect(body.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(body.checks.database).toBe(HEALTH_CHECK_STATUS.ERROR);
    expect(body.checks.valkey).toBe(HEALTH_CHECK_STATUS.OK);
  });

  it('retorna 503 quando valkey falha', async () => {
    pingDatabase.mockResolvedValue(undefined);
    pingValkey.mockRejectedValue(new Error('connection refused'));

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(503);

    const body = response.json();

    expect(body.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(body.checks.database).toBe(HEALTH_CHECK_STATUS.OK);
    expect(body.checks.valkey).toBe(HEALTH_CHECK_STATUS.ERROR);
  });

  it('retorna 503 quando ambos falham', async () => {
    pingDatabase.mockRejectedValue(new Error('connection refused'));
    pingValkey.mockRejectedValue(new Error('connection refused'));

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(503);

    const body = response.json();

    expect(body.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(body.checks).toEqual({
      database: HEALTH_CHECK_STATUS.ERROR,
      valkey: HEALTH_CHECK_STATUS.ERROR,
    });
  });
});
