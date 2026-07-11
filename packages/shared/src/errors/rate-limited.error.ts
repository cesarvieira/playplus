import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class RateLimitedError extends Error {
  readonly code: ErrorCode = ERROR_CODE.RATE_LIMITED;

  constructor(message = 'Muitas requisições, tente novamente em instantes') {
    super(message);
    this.name = 'RateLimitedError';
  }
}
