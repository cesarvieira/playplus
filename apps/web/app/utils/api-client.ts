import { ofetch, type FetchOptions } from 'ofetch';

import { buildApiFetchOptions } from '~/utils/api-fetch';

type ApiClientOptions = Pick<FetchOptions<'json'>, 'method' | 'body' | 'headers'>;

export async function apiFetch<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const { headers: extraHeaders, method, body } = options;

  if (import.meta.server) {
    const event = useRequestEvent();

    if (!event) {
      throw new Error('apiFetch no servidor requer useRequestEvent().');
    }

    const { serverApiFetch } = await import('~/utils/api-client.server');
    return serverApiFetch<T>(event, path, { method, body, headers: extraHeaders });
  }

  const config = useRuntimeConfig();
  const { credentials, headers } = buildApiFetchOptions(extraHeaders);

  return ofetch<T>(path, {
    method,
    body,
    baseURL: config.public.apiUrl,
    credentials,
    headers,
  });
}
