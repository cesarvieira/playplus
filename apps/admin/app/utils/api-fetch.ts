import type { FetchOptions } from 'ofetch';

export function buildApiFetchOptions(extraHeaders?: HeadersInit): {
  credentials: RequestCredentials;
  headers: Headers;
} {
  const headers = new Headers(extraHeaders);

  if (import.meta.server) {
    const { cookie } = useRequestHeaders(['cookie']);

    if (cookie) {
      headers.set('cookie', cookie);
    }
  }

  return {
    credentials: import.meta.client ? 'omit' : 'include',
    headers,
  };
}

export type ApiFetchOptions = Pick<FetchOptions, 'credentials' | 'headers'>;
