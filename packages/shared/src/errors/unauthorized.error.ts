import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class UnauthorizedError extends Error {
  readonly code: ErrorCode = ERROR_CODE.UNAUTHORIZED;

  constructor(message = 'Não autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
