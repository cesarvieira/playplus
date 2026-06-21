import { describe, expect, it } from 'vitest';

import { ERROR_CODE } from '@playplus/shared';

import { JobAlreadyQueuedError } from '../job-already-queued.error.ts';

describe('JobAlreadyQueuedError', () => {
  it('é instância de Error com code JOB_ALREADY_QUEUED', () => {
    const error = new JobAlreadyQueuedError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JobAlreadyQueuedError);
    expect(error.name).toBe('JobAlreadyQueuedError');
    expect(error.code).toBe(ERROR_CODE.JOB_ALREADY_QUEUED);
  });

  it('aceita mensagem customizada', () => {
    const error = new JobAlreadyQueuedError('Job duplicado');

    expect(error.message).toBe('Job duplicado');
  });
});
