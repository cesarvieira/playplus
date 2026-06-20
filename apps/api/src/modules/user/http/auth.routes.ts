import type { FastifyInstance, FastifyReply } from 'fastify';
import { UnauthorizedError } from '@playplus/shared';

import { env } from '#config/env';
import { db } from '#infra/database/client';
import { valkey } from '#infra/valkey/client';

import { LoginUseCase } from '../application/login.use-case.ts';
import type { InvalidCredentialsError } from '../domain/invalid-credentials.error.ts';
import { JwtService } from '../infra/jwt.service.ts';
import { RefreshTokenStore } from '../infra/refresh-token.store.ts';
import { UserRepository } from '../infra/user.repository.ts';
import {
  loginBodySchema,
  loginResponseSchema,
  errorResponseSchema,
  type LoginRequestBody,
} from './auth.schemas.ts';

function isInvalidCredentialsError(error: unknown): error is InvalidCredentialsError {
  return error instanceof Error && error.name === 'InvalidCredentialsError';
}

function normalizeLoginBody(body: LoginRequestBody): LoginRequestBody {
  return {
    email: body.email.trim().toLowerCase(),
    password: body.password,
  };
}

type ReplyWithCookie = FastifyReply & {
  setCookie(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      path?: string;
      maxAge?: number;
      secure?: boolean;
      sameSite?: 'lax' | 'strict' | 'none';
    },
  ): FastifyReply;
};

function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  options: {
    maxAge: number;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
  },
): void {
  (reply as ReplyWithCookie).setCookie('refresh_token', refreshToken, {
    httpOnly: true,
    path: '/',
    maxAge: options.maxAge,
    secure: options.secure,
    sameSite: options.sameSite,
  });
}

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const loginUseCase = new LoginUseCase(
    new UserRepository(db),
    new JwtService({
      secret: env.JWT_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    }),
    new RefreshTokenStore(valkey, env.JWT_REFRESH_TTL_SECONDS),
    env.JWT_ACCESS_TTL_SECONDS,
  );

  fastify.post(
    '/auth/login',
    {
      schema: {
        body: loginBodySchema,
        response: {
          200: loginResponseSchema,
          401: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
      preValidation: async (request) => {
        if (request.body && typeof request.body === 'object' && 'email' in request.body) {
          request.body = normalizeLoginBody(request.body as LoginRequestBody);
        }
      },
    },
    async (request, reply) => {
      try {
        const result = await loginUseCase.execute(request.body as LoginRequestBody);

        setRefreshTokenCookie(reply, result.refreshToken, {
          maxAge: env.JWT_REFRESH_TTL_SECONDS,
          secure: env.COOKIE_SECURE,
          sameSite: env.COOKIE_SAME_SITE,
        });

        return reply.status(200).send({
          access_token: result.accessToken,
          expires_in: result.expiresIn,
        });
      } catch (error) {
        if (isInvalidCredentialsError(error)) {
          throw new UnauthorizedError('Credenciais inválidas');
        }

        throw error;
      }
    },
  );
}
