import { readBody } from 'h3';

import { setAccessTokenCookie } from '#server/utils/access-cookie';
import { getServerRuntimeConfig } from '#server/utils/runtime-config';
import { verifyAccessToken } from '#server/utils/session';

interface SyncSessionBody {
  access_token?: string;
  expires_in?: number;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SyncSessionBody>(event);

  if (!body?.access_token || typeof body.expires_in !== 'number') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'access_token e expires_in são obrigatórios.',
    });
  }

  const config = getServerRuntimeConfig();
  const session = verifyAccessToken(body.access_token, config.jwtSecret);

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Token de acesso inválido.',
    });
  }

  setAccessTokenCookie(event, body.access_token, body.expires_in);

  return { ok: true as const };
});
