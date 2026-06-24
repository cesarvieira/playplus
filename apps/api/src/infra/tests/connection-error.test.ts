import { describe, expect, it } from 'vitest';

import { formatConnectionTarget, formatServiceConnectionError } from '../connection-error.ts';

describe('formatConnectionTarget', () => {
  it('formata host e porta de uma URL redis', () => {
    expect(formatConnectionTarget('redis://localhost:6379')).toBe('localhost:6379');
  });

  it('usa porta padrão do redis quando omitida', () => {
    expect(formatConnectionTarget('redis://valkey')).toBe('valkey:6379');
  });
});

describe('formatServiceConnectionError', () => {
  it('formata ECONNREFUSED de forma amigável', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });

    expect(formatServiceConnectionError(error, 'Valkey', 'redis://localhost:6379')).toBe(
      'Valkey indisponível em localhost:6379 (conexão recusada). Inicie o serviço com: docker compose up -d valkey',
    );
  });

  it('formata AggregateError com ECONNREFUSED', () => {
    const error = Object.assign(new AggregateError([new Error('connect ECONNREFUSED')]), {
      code: 'ECONNREFUSED',
    });

    expect(formatServiceConnectionError(error, 'Valkey', 'redis://localhost:6379')).toContain(
      'conexão recusada',
    );
  });
});
