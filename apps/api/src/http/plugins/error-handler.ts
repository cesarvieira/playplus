import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODE, type ErrorCode } from '@playplus/shared';

interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

interface ResolvedErrorResponse {
  statusCode: number;
  body: ErrorResponseBody;
}

const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ERROR_CODE.UNAUTHORIZED]: 401,
  [ERROR_CODE.INVALID_TOKEN]: 401,
  [ERROR_CODE.FORBIDDEN]: 403,
  [ERROR_CODE.USER_NOT_FOUND]: 404,
  [ERROR_CODE.VIDEO_NOT_FOUND]: 404,
  [ERROR_CODE.VALIDATION_ERROR]: 422,
  [ERROR_CODE.VIDEO_NOT_READY]: 409,
  [ERROR_CODE.JOB_ALREADY_QUEUED]: 409,
  [ERROR_CODE.CATEGORY_ALREADY_EXISTS]: 409,
  [ERROR_CODE.RATE_LIMITED]: 429,
  [ERROR_CODE.INTERNAL_ERROR]: 500,
};

const INTERNAL_ERROR_MESSAGE = 'Erro interno do servidor';
const VALIDATION_ERROR_MESSAGE = 'Dados inválidos';

const ERROR_CODE_VALUES = new Set<string>(Object.values(ERROR_CODE));

function isErrorCode(value: string): value is ErrorCode {
  return ERROR_CODE_VALUES.has(value);
}

function isFastifyValidationError(error: FastifyError): boolean {
  return error.code === 'FST_ERR_VALIDATION' || error.validation !== undefined;
}

function getValidationMessage(error: FastifyError): string {
  const firstIssue = error.validation?.[0];

  if (!firstIssue) {
    return VALIDATION_ERROR_MESSAGE;
  }

  if (typeof firstIssue.message === 'string' && firstIssue.message.length > 0) {
    return firstIssue.message;
  }

  return VALIDATION_ERROR_MESSAGE;
}

function isSharedError(error: unknown): error is Error & { code: ErrorCode } {
  if (!(error instanceof Error)) {
    return false;
  }

  if (!('code' in error)) {
    return false;
  }

  const code = (error as { code: unknown }).code;

  return typeof code === 'string' && isErrorCode(code);
}

function internalErrorResponse(): ResolvedErrorResponse {
  return {
    statusCode: ERROR_HTTP_STATUS[ERROR_CODE.INTERNAL_ERROR],
    body: {
      error: {
        code: ERROR_CODE.INTERNAL_ERROR,
        message: INTERNAL_ERROR_MESSAGE,
      },
    },
  };
}

export function resolveErrorResponse(error: unknown): ResolvedErrorResponse {
  if (
    error !== null &&
    typeof error === 'object' &&
    isFastifyValidationError(error as FastifyError)
  ) {
    return {
      statusCode: ERROR_HTTP_STATUS[ERROR_CODE.VALIDATION_ERROR],
      body: {
        error: {
          code: ERROR_CODE.VALIDATION_ERROR,
          message: getValidationMessage(error as FastifyError),
        },
      },
    };
  }

  if (isSharedError(error)) {
    return {
      statusCode: ERROR_HTTP_STATUS[error.code],
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  return internalErrorResponse();
}

export default async function errorHandlerPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    const { statusCode, body } = resolveErrorResponse(error);

    if (statusCode === ERROR_HTTP_STATUS[ERROR_CODE.INTERNAL_ERROR]) {
      fastify.log.error({ err: error }, 'Erro interno não tratado');
    }

    return reply.status(statusCode).send(body);
  });
}
