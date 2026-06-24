import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mapAuthResponse } from '../auth';
import { persistAuthResponse, syncSessionCookie } from '../session-bridge';

const fetchMock = vi.fn();

vi.stubGlobal('$fetch', fetchMock);

describe('session-bridge', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
  });

  it('envia access token para rota de sync do admin', async () => {
    await syncSessionCookie('token-abc', 900);

    expect(fetchMock).toHaveBeenCalledWith('/api/session/sync', {
      method: 'POST',
      body: {
        access_token: 'token-abc',
        expires_in: 900,
      },
    });
  });

  it('persiste resposta de auth e retorna campos mapeados', async () => {
    const result = await persistAuthResponse({
      access_token: 'jwt-token',
      expires_in: 900,
    });

    expect(result).toEqual(mapAuthResponse({ access_token: 'jwt-token', expires_in: 900 }));
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
