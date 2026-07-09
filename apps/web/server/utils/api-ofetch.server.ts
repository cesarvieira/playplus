import type { FetchOptions } from 'ofetch';
import { ofetch } from 'ofetch';

export async function apiOfetch<T>(url: string, options: FetchOptions<'json'> = {}): Promise<T> {
  return ofetch<T>(url, options);
}

export async function apiOfetchRaw<T>(url: string, options: FetchOptions<'json'> = {}) {
  return ofetch.raw<T>(url, options);
}
