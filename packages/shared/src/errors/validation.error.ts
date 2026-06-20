import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class ValidationError extends Error {
  readonly code: ErrorCode = ERROR_CODE.VALIDATION_ERROR;

  constructor(message = 'Dados inválidos') {
    super(message);
    this.name = 'ValidationError';
  }
}
