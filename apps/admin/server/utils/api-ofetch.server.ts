import type { FetchOptions } from 'ofetch';
import { ofetch } from 'ofetch';

let devTlsAgent: import('node:https').Agent | undefined;

function isDevTlsApiFetch(baseURL: string | undefined): boolean {
  return (
    Boolean(process.env.DEV_TLS_CERT) &&
    typeof baseURL === 'string' &&
    baseURL.startsWith('https://')
  );
}

async function getDevTlsAgent(): Promise<import('node:https').Agent> {
  if (!devTlsAgent) {
    const { Agent } = await import('node:https');
    devTlsAgent = new Agent({
      rejectUnauthorized: false,
    });
  }

  return devTlsAgent;
}

async function withDevTlsAgent<T extends FetchOptions<'json'>>(options: T): Promise<T> {
  if (!isDevTlsApiFetch(typeof options.baseURL === 'string' ? options.baseURL : undefined)) {
    return options;
  }

  return {
    ...options,
    agent: await getDevTlsAgent(),
  };
}

export async function apiOfetch<T>(url: string, options: FetchOptions<'json'> = {}): Promise<T> {
  return ofetch<T>(url, await withDevTlsAgent(options));
}

export async function apiOfetchRaw<T>(url: string, options: FetchOptions<'json'> = {}) {
  return ofetch.raw<T>(url, await withDevTlsAgent(options));
}
