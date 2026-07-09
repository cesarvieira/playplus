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
  });

  it('delega para ofetch repassando as opções', async () => {
    await apiOfetch('/videos', { baseURL: 'https://api.playplus.localhost/v1' });

    expect(ofetchMock).toHaveBeenCalledWith('/videos', {
      baseURL: 'https://api.playplus.localhost/v1',
    });
  });

  it('delega para ofetch.raw repassando as opções', async () => {
    await apiOfetchRaw('/auth/refresh', { method: 'POST' });

    expect(ofetchRawMock).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' });
  });
});
