import type { FastifyInstance } from 'fastify';
import { InvalidTokenError, UnauthorizedError } from '@playplus/shared';

import { env } from '#config/env';
import { db } from '#infra/database/client';
import { valkey } from '#infra/valkey/client';
import { RATE_LIMIT_WRITE } from '#http/rate-limit-presets';

import { LoginUseCase } from '../application/login.use-case.ts';
import { LogoutUseCase } from '../application/logout.use-case.ts';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case.ts';
import type { InvalidCredentialsError } from '../domain/invalid-credentials.error.ts';
import { JwtService } from '../infra/jwt.service.ts';
import { RefreshTokenStore } from '../infra/refresh-token.store.ts';
import { UserRepository } from '../infra/user.repository.ts';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromCookies,
  setRefreshTokenCookie,
} from './auth-cookies.ts';
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

const cookieOptions = {
  maxAge: env.JWT_REFRESH_TTL_SECONDS,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN,
};

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const jwtService = new JwtService({
    secret: env.JWT_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
  });
  const userRepository = new UserRepository(db);
  const refreshTokenStore = new RefreshTokenStore(valkey, env.JWT_REFRESH_TTL_SECONDS);

  const loginUseCase = new LoginUseCase(
    userRepository,
    jwtService,
    refreshTokenStore,
    env.JWT_ACCESS_TTL_SECONDS,
  );
  const refreshTokenUseCase = new RefreshTokenUseCase(
    refreshTokenStore,
    userRepository,
    jwtService,
    env.JWT_ACCESS_TTL_SECONDS,
  );
  const logoutUseCase = new LogoutUseCase(refreshTokenStore);

  fastify.post(
    '/auth/login',
    {
      config: { rateLimit: RATE_LIMIT_WRITE },
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

        setRefreshTokenCookie(reply, result.refreshToken, cookieOptions);

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

  fastify.post(
    '/auth/refresh',
    {
      config: { rateLimit: RATE_LIMIT_WRITE },
      schema: {
        response: {
          200: loginResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const refreshToken = getRefreshTokenFromCookies(request.cookies);

      if (!refreshToken) {
        throw new InvalidTokenError();
      }

      const result = await refreshTokenUseCase.execute(refreshToken);

      setRefreshTokenCookie(reply, result.refreshToken, cookieOptions);

      return reply.status(200).send({
        access_token: result.accessToken,
        expires_in: result.expiresIn,
      });
    },
  );

  fastify.post(
    '/auth/logout',
    {
      config: { rateLimit: RATE_LIMIT_WRITE },
      schema: {
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request, reply) => {
      const refreshToken = getRefreshTokenFromCookies(request.cookies);

      await logoutUseCase.execute(refreshToken);

      clearRefreshTokenCookie(reply, {
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE,
        domain: env.COOKIE_DOMAIN,
      });

      return reply.status(204).send();
    },
  );
}
