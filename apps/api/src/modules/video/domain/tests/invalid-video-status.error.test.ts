import { describe, expect, it } from 'vitest';

import { ERROR_CODE } from '@playplus/shared';

import { InvalidVideoStatusError } from '#modules/video/domain/invalid-video-status.error';

describe('InvalidVideoStatusError', () => {
  it('é instância de Error com code VIDEO_NOT_READY', () => {
    const error = new InvalidVideoStatusError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvalidVideoStatusError);
    expect(error.name).toBe('InvalidVideoStatusError');
    expect(error.code).toBe(ERROR_CODE.VIDEO_NOT_READY);
  });

  it('aceita mensagem customizada', () => {
    const error = new InvalidVideoStatusError('Status inválido');

    expect(error.message).toBe('Status inválido');
  });
});
