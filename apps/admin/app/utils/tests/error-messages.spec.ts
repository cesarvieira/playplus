import { describe, expect, it } from 'vitest';
import { ERROR_CODE } from '@playplus/shared';

import { getErrorMessage, getSessionExpiredMessage, resolveErrorMessage } from '../error-messages';

describe('getErrorMessage', () => {
  it('uses login override for unauthorized credentials', () => {
    expect(getErrorMessage(ERROR_CODE.UNAUTHORIZED, 'login')).toBe('E-mail ou senha incorretos.');
  });

  it('uses default message outside login context', () => {
    expect(getErrorMessage(ERROR_CODE.UNAUTHORIZED, 'default')).toBe(
      'Não autorizado. Faça login novamente.',
    );
  });

  it('maps validation errors', () => {
    expect(getErrorMessage(ERROR_CODE.VALIDATION_ERROR)).toBe(
      'Verifique os campos e tente novamente.',
    );
  });
});

describe('resolveErrorMessage', () => {
  it('falls back for unknown codes', () => {
    expect(resolveErrorMessage('UNKNOWN', 'default', 'Falhou')).toBe('Falhou');
  });
});

describe('getSessionExpiredMessage', () => {
  it('returns session expired copy', () => {
    expect(getSessionExpiredMessage()).toBe('Sua sessão expirou. Faça login novamente.');
  });
});
