import { ERROR_CODE } from '@playplus/shared';
import type { ErrorCode } from '@playplus/shared';

export class JobAlreadyQueuedError extends Error {
  readonly code: ErrorCode = ERROR_CODE.JOB_ALREADY_QUEUED;

  constructor(message = 'Job de transcodificação já enfileirado') {
    super(message);
    this.name = 'JobAlreadyQueuedError';
  }
}
