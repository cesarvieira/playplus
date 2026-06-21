import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class InvalidTokenError extends Error {
  readonly code: ErrorCode = ERROR_CODE.INVALID_TOKEN;

  constructor(message = 'Refresh token inválido ou expirado') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}
