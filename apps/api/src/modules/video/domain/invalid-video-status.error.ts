import { ERROR_CODE } from '@playplus/shared';
import type { ErrorCode } from '@playplus/shared';

export class InvalidVideoStatusError extends Error {
  readonly code: ErrorCode = ERROR_CODE.VIDEO_NOT_READY;

  constructor(message = 'Status de vídeo inválido para esta operação') {
    super(message);
    this.name = 'InvalidVideoStatusError';
  }
}
