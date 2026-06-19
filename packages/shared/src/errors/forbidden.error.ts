import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class ForbiddenError extends Error {
  readonly code: ErrorCode = ERROR_CODE.FORBIDDEN;

  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
