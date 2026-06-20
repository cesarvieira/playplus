import { ERROR_CODE } from '../enums/error-code.js';
import type { ErrorCode } from '../enums/error-code.js';

export class VideoNotFoundError extends Error {
  readonly code: ErrorCode = ERROR_CODE.VIDEO_NOT_FOUND;

  constructor(message = 'Vídeo não encontrado') {
    super(message);
    this.name = 'VideoNotFoundError';
  }
}
