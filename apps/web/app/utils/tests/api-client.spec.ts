import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApiFetchOptions } from '../api-fetch';

import { apiFetch } from '../api-client';

const { ofetchMock } = vi.hoisted(() => ({
  ofetchMock: vi.fn(),
}));

vi.mock('ofetch', () => ({
  ofetch: ofetchMock,
}));

describe('buildApiFetchOptions', () => {
  it('uses credentials omit on client and preserves extra headers', () => {
    const { credentials, headers } = buildApiFetchOptions({ 'X-Custom': '1' });

    expect(credentials).toBe(import.meta.client ? 'omit' : 'include');
    expect(headers.get('X-Custom')).toBe('1');
  });

  it('forwards cookie header on server when present', async () => {
    await mountSuspended({
      setup() {
        vi.stubGlobal('useRequestHeaders', () => ({ cookie: 'access_token=jwt' }));
      },
      template: '<div />',
    });

    if (!import.meta.server) {
      return;
    }

    const { credentials, headers } = buildApiFetchOptions();

    expect(credentials).toBe('include');
    expect(headers.get('cookie')).toBe('access_token=jwt');
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    ofetchMock.mockReset();
    ofetchMock.mockResolvedValue({ ok: true });
  });

  it('delegates to ofetch with runtime apiUrl on client', async () => {
    if (!import.meta.client) {
      return;
    }

    const config = useRuntimeConfig();

    await mountSuspended({
      async setup() {
        await apiFetch('/videos', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      },
      template: '<div />',
    });

    expect(ofetchMock).toHaveBeenCalledWith('/videos', {
      method: 'GET',
      body: undefined,
      baseURL: config.public.apiUrl,
      credentials: 'omit',
      headers: expect.any(Headers),
    });

    const callHeaders = ofetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(callHeaders.get('Accept')).toBe('application/json');
  });

  it('throws on server until SSR support lands in issue #55', async () => {
    if (!import.meta.server) {
      return;
    }

    await mountSuspended({
      async setup() {
        await expect(apiFetch('/videos')).rejects.toThrow(
          'apiFetch no servidor ainda não implementado — ver issue #55.',
        );
      },
      template: '<div />',
    });
  });
});
