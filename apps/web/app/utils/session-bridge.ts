import type { ApiAuthResponse } from './auth';
import { mapAuthResponse } from './auth';

export async function syncSessionCookie(accessToken: string, expiresIn: number): Promise<void> {
  await $fetch('/api/session/sync', {
    method: 'POST',
    body: {
      access_token: accessToken,
      expires_in: expiresIn,
    },
  });
}

export async function clearWebSessionCookie(): Promise<void> {
  await $fetch('/api/session/logout', {
    method: 'POST',
  });
}

export async function persistAuthResponse(data: ApiAuthResponse): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const mapped = mapAuthResponse(data);
  await syncSessionCookie(mapped.accessToken, mapped.expiresIn);
  return mapped;
}
