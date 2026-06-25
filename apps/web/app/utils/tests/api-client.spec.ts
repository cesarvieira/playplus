import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApiFetchOptions } from '../api-fetch';

import { apiFetch } from '../api-client';

const { ofetchMock, serverApiFetchMock } = vi.hoisted(() => ({
  ofetchMock: vi.fn(),
  serverApiFetchMock: vi.fn(),
}));

vi.mock('ofetch', () => ({
  ofetch: ofetchMock,
}));

vi.mock('../api-client.server', () => ({
  serverApiFetch: serverApiFetchMock,
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

    const { credentials, headers } = buildApiFetchOptions();

    if (import.meta.server) {
      expect(credentials).toBe('include');
      expect(headers.get('cookie')).toBe('access_token=jwt');
      return;
    }

    expect(credentials).toBe('omit');
  });

  it('omits cookie header on server when absent', async () => {
    await mountSuspended({
      setup() {
        vi.stubGlobal('useRequestHeaders', () => ({}));
      },
      template: '<div />',
    });

    if (!import.meta.server) {
      return;
    }

    const { headers } = buildApiFetchOptions();
    expect(headers.get('cookie')).toBeNull();
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    ofetchMock.mockReset();
    ofetchMock.mockResolvedValue({ ok: true });
    serverApiFetchMock.mockReset();
    serverApiFetchMock.mockResolvedValue({ ok: true });
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

  it('delegates to serverApiFetch on server when request event is available', async () => {
    if (!import.meta.server) {
      return;
    }

    const event = { node: { req: { headers: {} } } };

    await mountSuspended({
      async setup() {
        vi.stubGlobal('useRequestEvent', () => event);
        await apiFetch('/videos', { method: 'GET' });
      },
      template: '<div />',
    });

    expect(serverApiFetchMock).toHaveBeenCalledWith(event, '/videos', {
      method: 'GET',
      body: undefined,
      headers: undefined,
    });
    expect(ofetchMock).not.toHaveBeenCalled();
  });

  it('throws on server when request event is missing', async () => {
    if (!import.meta.server) {
      return;
    }

    await mountSuspended({
      async setup() {
        vi.stubGlobal('useRequestEvent', () => undefined);
        await expect(apiFetch('/videos')).rejects.toThrow(
          'apiFetch no servidor requer useRequestEvent().',
        );
      },
      template: '<div />',
    });
  });
});
