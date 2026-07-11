import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class CategoryAlreadyExistsError extends Error {
  readonly code: ErrorCode = ERROR_CODE.CATEGORY_ALREADY_EXISTS;

  constructor(message = 'Categoria já existe') {
    super(message);
    this.name = 'CategoryAlreadyExistsError';
  }
}
