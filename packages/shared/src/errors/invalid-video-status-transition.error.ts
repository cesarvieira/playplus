import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class InvalidVideoStatusTransitionError extends Error {
  readonly code: ErrorCode = ERROR_CODE.VIDEO_NOT_READY;

  constructor(message = 'Transição de status de vídeo inválida') {
    super(message);
    this.name = 'InvalidVideoStatusTransitionError';
  }
}
