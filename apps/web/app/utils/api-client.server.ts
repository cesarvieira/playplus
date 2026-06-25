import type { H3Event } from 'h3';
import type { FetchOptions } from 'ofetch';

type ServerApiFetchOptions = Pick<FetchOptions<'json'>, 'method' | 'body' | 'headers'>;

export async function serverApiFetch<T>(
  event: H3Event,
  path: string,
  options: ServerApiFetchOptions = {},
): Promise<T> {
  const { serverApiFetch: fetchFromNitro } = await import('~~/server/utils/server-api-fetch');
  return fetchFromNitro<T>(event, path, options);
}
