import { describe, expect, it } from 'vitest';

import { InvalidCredentialsError } from './invalid-credentials.error.ts';

describe('InvalidCredentialsError', () => {
  it('é instância de Error', () => {
    const error = new InvalidCredentialsError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvalidCredentialsError);
  });

  it('define name e mensagem padrão', () => {
    const error = new InvalidCredentialsError();

    expect(error.name).toBe('InvalidCredentialsError');
    expect(error.message).toBe('Credenciais inválidas');
  });

  it('aceita mensagem customizada', () => {
    const error = new InvalidCredentialsError('Falha no login');

    expect(error.message).toBe('Falha no login');
  });
});
