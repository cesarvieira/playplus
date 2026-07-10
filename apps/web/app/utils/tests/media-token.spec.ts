import { describe, expect, it } from 'vitest';

import { appendMediaToken, extractMediaToken, getTokenExpiry } from '~/utils/media-token';

const token = 'eyJwIjoidmlkZW9zLzEifQ.c2ln';

/** Monta um token com payload `{ p, e }` (base64url) e assinatura fictícia. */
function tokenWithExpiry(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ p: 'videos/1', e: expSeconds }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${payload}.c2ln`;
}

describe('extractMediaToken', () => {
  it('extrai o token da query', () => {
    expect(extractMediaToken(`https://cdn/videos/1/hls/master.m3u8?t=${token}`)).toBe(token);
  });

  it('retorna null quando não há query', () => {
    expect(extractMediaToken('https://cdn/videos/1/hls/master.m3u8')).toBeNull();
  });

  it('retorna null quando não há param t', () => {
    expect(extractMediaToken('https://cdn/videos/1/hls/master.m3u8?foo=bar')).toBeNull();
  });
});

describe('appendMediaToken', () => {
  it('anexa o token a uma URL relativa resolvida sem query', () => {
    expect(appendMediaToken('https://cdn/videos/1/hls/720p/seg_1.ts', token)).toBe(
      `https://cdn/videos/1/hls/720p/seg_1.ts?t=${token}`,
    );
  });

  it('usa & quando a URL já tem query', () => {
    expect(appendMediaToken('https://cdn/videos/1/hls/seg.ts?x=1', token)).toBe(
      `https://cdn/videos/1/hls/seg.ts?x=1&t=${token}`,
    );
  });

  it('não duplica quando o token já está presente', () => {
    const url = `https://cdn/videos/1/hls/master.m3u8?t=${token}`;
    expect(appendMediaToken(url, token)).toBe(url);
  });

  it('retorna a URL intacta quando não há token', () => {
    expect(appendMediaToken('https://cdn/videos/1/hls/master.m3u8', null)).toBe(
      'https://cdn/videos/1/hls/master.m3u8',
    );
  });
});

describe('getTokenExpiry', () => {
  it('devolve o exp em ms epoch', () => {
    expect(getTokenExpiry(tokenWithExpiry(1_700_000_000))).toBe(1_700_000_000_000);
  });

  it('retorna null quando o payload não tem exp numérico', () => {
    expect(getTokenExpiry(token)).toBeNull();
  });

  it('retorna null para token sem assinatura', () => {
    expect(getTokenExpiry('semponto')).toBeNull();
  });

  it('retorna null para payload ilegível', () => {
    expect(getTokenExpiry('!!!.c2ln')).toBeNull();
  });
});
