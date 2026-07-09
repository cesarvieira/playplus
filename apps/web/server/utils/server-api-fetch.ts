import type { H3Event } from 'h3';
import type { FetchOptions } from 'ofetch';

import { getServerRuntimeConfig } from './runtime-config';
import { signDelegationJwt } from './delegation-jwt';
import { ensureServerSession } from './session-refresh';

type ServerApiFetchOptions = Pick<FetchOptions<'json'>, 'method' | 'body' | 'headers'>;

export async function serverApiFetch<T>(
  event: H3Event,
  path: string,
  options: ServerApiFetchOptions = {},
): Promise<T> {
  const config = getServerRuntimeConfig();
  const session = await ensureServerSession(event);

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Sessão inválida ou expirada.',
    });
  }

  const delegationJwt = signDelegationJwt(
    session.userId,
    config.delegationJwtSecret,
    config.delegationJwtTtlSeconds,
  );

  const headers = new Headers(options.headers ?? undefined);
  headers.set('Authorization', `Bearer ${config.m2mServiceToken}`);
  headers.set('X-User-Id', delegationJwt);

  const { apiOfetch } = await import('./api-ofetch.server');

  return apiOfetch<T>(path, {
    method: options.method,
    body: options.body,
    baseURL: config.apiInternalBaseUrl,
    headers,
  });
}
