import type { FastifyReply } from 'fastify';

interface CookieOptions {
  maxAge: number;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain?: string;
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
const REFRESH_COOKIE_PATH = '/v1/auth/refresh';

interface CookieAttributeOptions extends Pick<CookieOptions, 'secure' | 'sameSite'> {
  domain?: string;
}

function cookieAttributes(options: CookieAttributeOptions) {
  return {
    httpOnly: true,
    path: REFRESH_COOKIE_PATH,
    secure: options.secure,
    sameSite: options.sameSite,
    ...(options.domain ? { domain: options.domain } : {}),
  };
}

export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  options: CookieOptions,
): void {
  (reply as ReplyWithCookie).setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieAttributes({
      secure: options.secure,
      sameSite: options.sameSite,
      domain: options.domain,
    }),
    maxAge: options.maxAge,
  });
}

export function clearRefreshTokenCookie(
  reply: FastifyReply,
  options: CookieAttributeOptions,
): void {
  (reply as ReplyWithCookie).clearCookie(REFRESH_TOKEN_COOKIE, cookieAttributes(options));
}

export function getRefreshTokenFromCookies(
  cookies: Record<string, string | undefined> | undefined,
): string | undefined {
  return cookies?.[REFRESH_TOKEN_COOKIE];
}
