import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class UserNotFoundError extends Error {
  readonly code: ErrorCode = ERROR_CODE.USER_NOT_FOUND;

  constructor(message = 'Usuário não encontrado') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}
