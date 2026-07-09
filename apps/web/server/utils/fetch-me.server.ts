import type { H3Event } from 'h3';

import type { ApiMeResponse } from '~/utils/auth';

import { getServerRuntimeConfig } from './runtime-config';
import { getServerAccessToken } from './session-refresh';

export async function fetchMeWithServerSession(event: H3Event): Promise<ApiMeResponse | null> {
  const accessToken = getServerAccessToken(event);

  if (!accessToken) {
    return null;
  }

  const config = getServerRuntimeConfig();
  const { apiOfetch } = await import('./api-ofetch.server');

  try {
    return await apiOfetch<ApiMeResponse>('/me', {
      baseURL: config.apiInternalBaseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return null;
  }
}
