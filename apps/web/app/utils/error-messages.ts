import { ERROR_CODE, type ErrorCode } from '@playplus/shared';

type ErrorContext = 'login' | 'default';

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODE.UNAUTHORIZED]: 'Não autorizado. Faça login novamente.',
  [ERROR_CODE.INVALID_TOKEN]: 'Sessão expirada. Faça login novamente.',
  [ERROR_CODE.FORBIDDEN]: 'Você não tem permissão para esta ação.',
  [ERROR_CODE.USER_NOT_FOUND]: 'Usuário não encontrado.',
  [ERROR_CODE.VIDEO_NOT_FOUND]: 'Vídeo não encontrado.',
  [ERROR_CODE.VIDEO_NOT_READY]: 'Vídeo ainda em processamento.',
  [ERROR_CODE.JOB_ALREADY_QUEUED]: 'Transcodificação já está na fila.',
  [ERROR_CODE.CATEGORY_ALREADY_EXISTS]: 'Categoria já existe.',
  [ERROR_CODE.VALIDATION_ERROR]: 'Verifique os campos e tente novamente.',
  [ERROR_CODE.RATE_LIMITED]: 'Muitas tentativas. Aguarde um instante e tente novamente.',
  [ERROR_CODE.INTERNAL_ERROR]: 'Erro interno. Tente novamente em instantes.',
};

const LOGIN_OVERRIDES: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODE.UNAUTHORIZED]: 'E-mail ou senha incorretos.',
};

export function getErrorMessage(code: ErrorCode, context: ErrorContext = 'default'): string {
  if (context === 'login' && code in LOGIN_OVERRIDES) {
    return LOGIN_OVERRIDES[code]!;
  }

  return DEFAULT_MESSAGES[code];
}

export function getSessionExpiredMessage(): string {
  return 'Sua sessão expirou. Faça login novamente.';
}

function isErrorCode(value: string): value is ErrorCode {
  return Object.values(ERROR_CODE).includes(value as ErrorCode);
}

export function resolveErrorMessage(
  code: string | undefined,
  context: ErrorContext = 'default',
  fallback = 'Ocorreu um erro. Tente novamente.',
): string {
  if (code && isErrorCode(code)) {
    return getErrorMessage(code, context);
  }

  return fallback;
}
