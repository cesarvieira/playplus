import { describe, expect, it, vi } from 'vitest';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ERROR_CODE,
  ForbiddenError,
  UnauthorizedError,
  UserNotFoundError,
  ValidationError,
  VideoNotFoundError,
} from '@playplus/shared';
import errorHandlerPlugin, { resolveErrorResponse } from './error-handler.js';

describe('resolveErrorResponse', () => {
  it('mapeia UnauthorizedError para 401', () => {
    const result = resolveErrorResponse(new UnauthorizedError());

    expect(result).toEqual({
      statusCode: 401,
      body: {
        error: {
          code: ERROR_CODE.UNAUTHORIZED,
          message: 'Não autorizado',
        },
      },
    });
  });

  it('mapeia ForbiddenError para 403', () => {
    const result = resolveErrorResponse(new ForbiddenError('Sem permissão'));

    expect(result).toEqual({
      statusCode: 403,
      body: {
        error: {
          code: ERROR_CODE.FORBIDDEN,
          message: 'Sem permissão',
        },
      },
    });
  });

  it('mapeia ValidationError para 422', () => {
    const result = resolveErrorResponse(new ValidationError('Campo inválido'));

    expect(result).toEqual({
      statusCode: 422,
      body: {
        error: {
          code: ERROR_CODE.VALIDATION_ERROR,
          message: 'Campo inválido',
        },
      },
    });
  });

  it('mapeia UserNotFoundError para 404', () => {
    const result = resolveErrorResponse(new UserNotFoundError());

    expect(result).toEqual({
      statusCode: 404,
      body: {
        error: {
          code: ERROR_CODE.USER_NOT_FOUND,
          message: 'Usuário não encontrado',
        },
      },
    });
  });

  it('mapeia VideoNotFoundError para 404', () => {
    const result = resolveErrorResponse(new VideoNotFoundError());

    expect(result).toEqual({
      statusCode: 404,
      body: {
        error: {
          code: ERROR_CODE.VIDEO_NOT_FOUND,
          message: 'Vídeo não encontrado',
        },
      },
    });
  });

  it('usa mensagem padrão quando validation está vazio', () => {
    const fastifyValidationError = {
      name: 'FastifyError',
      message: 'validation failed',
      code: 'FST_ERR_VALIDATION',
      statusCode: 400,
      validation: [],
    } as FastifyError;

    const result = resolveErrorResponse(fastifyValidationError);

    expect(result.body.error.message).toBe('Dados inválidos');
  });

  it('usa mensagem padrão quando validation message está vazia', () => {
    const fastifyValidationError = {
      name: 'FastifyError',
      message: 'validation failed',
      code: 'FST_ERR_VALIDATION',
      statusCode: 400,
      validation: [{ message: '' }],
    } as FastifyError;

    const result = resolveErrorResponse(fastifyValidationError);

    expect(result.body.error.message).toBe('Dados inválidos');
  });

  it('mapeia valor não-Error para 500 INTERNAL_ERROR', () => {
    const result = resolveErrorResponse('falha inesperada');

    expect(result.statusCode).toBe(500);
    expect(result.body.error.code).toBe(ERROR_CODE.INTERNAL_ERROR);
  });

  it('mapeia erro de validação Fastify para 422 VALIDATION_ERROR', () => {
    const fastifyValidationError = {
      name: 'FastifyError',
      message: 'body must have required property email',
      code: 'FST_ERR_VALIDATION',
      statusCode: 400,
      validation: [
        {
          message: 'must have required property email',
        },
      ],
    } as FastifyError;

    const result = resolveErrorResponse(fastifyValidationError);

    expect(result).toEqual({
      statusCode: 422,
      body: {
        error: {
          code: ERROR_CODE.VALIDATION_ERROR,
          message: 'must have required property email',
        },
      },
    });
  });

  it('mapeia erro genérico para 500 INTERNAL_ERROR', () => {
    const result = resolveErrorResponse(new Error('boom'));

    expect(result).toEqual({
      statusCode: 500,
      body: {
        error: {
          code: ERROR_CODE.INTERNAL_ERROR,
          message: 'Erro interno do servidor',
        },
      },
    });
  });

  it('mapeia erro com code desconhecido para 500 INTERNAL_ERROR', () => {
    class UnknownError extends Error {
      readonly code = 'UNKNOWN';
    }

    const result = resolveErrorResponse(new UnknownError('falhou'));

    expect(result).toEqual({
      statusCode: 500,
      body: {
        error: {
          code: ERROR_CODE.INTERNAL_ERROR,
          message: 'Erro interno do servidor',
        },
      },
    });
  });

  it('mapeia ErrorCode futuro por duck-typing sem classe dedicada', () => {
    class VideoNotReadyError extends Error {
      readonly code = ERROR_CODE.VIDEO_NOT_READY;

      constructor() {
        super('Vídeo ainda em processamento');
        this.name = 'VideoNotReadyError';
      }
    }

    const result = resolveErrorResponse(new VideoNotReadyError());

    expect(result).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: ERROR_CODE.VIDEO_NOT_READY,
          message: 'Vídeo ainda em processamento',
        },
      },
    });
  });
});

describe('errorHandlerPlugin', () => {
  it('registra handler que responde com formato padronizado', async () => {
    let errorHandler: (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => unknown = () => undefined;

    const fastify = {
      setErrorHandler: (handler: typeof errorHandler) => {
        errorHandler = handler;
      },
      log: {
        error: vi.fn(),
      },
    } as unknown as FastifyInstance;

    await errorHandlerPlugin(fastify);

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as FastifyReply;

    await errorHandler(new Error('boom') as FastifyError, {} as FastifyRequest, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        code: ERROR_CODE.INTERNAL_ERROR,
        message: 'Erro interno do servidor',
      },
    });
    expect(fastify.log.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Erro interno não tratado',
    );
  });
});
