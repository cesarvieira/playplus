import type { FastifyReply } from 'fastify';

interface CookieOptions {
  maxAge: number;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
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
  clearCookie(
    name: string,
    options?: {
      path?: string;
      secure?: boolean;
      sameSite?: 'lax' | 'strict' | 'none';
    },
  ): FastifyReply;
};

const REFRESH_TOKEN_COOKIE = 'refresh_token';

function cookieAttributes(options: Pick<CookieOptions, 'secure' | 'sameSite'>) {
  return {
    httpOnly: true,
    path: '/',
    secure: options.secure,
    sameSite: options.sameSite,
  };
}

export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  options: CookieOptions,
): void {
  (reply as ReplyWithCookie).setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieAttributes(options),
    maxAge: options.maxAge,
  });
}

export function clearRefreshTokenCookie(
  reply: FastifyReply,
  options: Pick<CookieOptions, 'secure' | 'sameSite'>,
): void {
  (reply as ReplyWithCookie).clearCookie(REFRESH_TOKEN_COOKIE, cookieAttributes(options));
}

export function getRefreshTokenFromCookies(
  cookies: Record<string, string | undefined> | undefined,
): string | undefined {
  return cookies?.[REFRESH_TOKEN_COOKIE];
}
