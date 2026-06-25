import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiOfetch, apiOfetchRaw } from '../api-ofetch.server';

const ofetchMock = vi.hoisted(() => vi.fn());
const ofetchRawMock = vi.hoisted(() => vi.fn());

vi.mock('ofetch', () => ({
  ofetch: Object.assign(ofetchMock, { raw: ofetchRawMock }),
}));

describe('api-ofetch.server', () => {
  beforeEach(() => {
    ofetchMock.mockReset();
    ofetchRawMock.mockReset();
    ofetchMock.mockResolvedValue({ ok: true });
    ofetchRawMock.mockResolvedValue({ ok: true, _data: {} });
    delete process.env.DEV_TLS_CERT;
  });

  it('delega para ofetch sem agent em HTTP', async () => {
    await apiOfetch('/videos', { baseURL: 'http://localhost:3000/v1' });

    expect(ofetchMock).toHaveBeenCalledWith('/videos', {
      baseURL: 'http://localhost:3000/v1',
    });
  });

  it('delega para ofetch.raw', async () => {
    await apiOfetchRaw('/auth/refresh', { method: 'POST' });

    expect(ofetchRawMock).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' });
  });

  it('injeta agent TLS em dev para baseURL HTTPS', async () => {
    process.env.DEV_TLS_CERT = 'certs/playplus.pem';

    await apiOfetch('/videos', { baseURL: 'https://api.playplus.localhost/v1' });

    const options = ofetchMock.mock.calls[0]?.[1] as { agent?: unknown };
    expect(options.agent).toBeDefined();
  });
});
