/**
 * Propagação do token de mídia (ADR-007) no player.
 *
 * A `stream_url` chega assinada (`.../master.m3u8?t=<token>`). As URLs de
 * playlists e segmentos do HLS são relativas e perdem a query na resolução, então
 * o loader do hls.js precisa reanexar o **mesmo** token a cada requisição — é
 * assim que o gate (Worker em prod, Caddy em dev) autoriza cada segmento.
 */

/** Converte base64url em base64 padrão (com padding) para o `atob`. */
function base64UrlToBase64(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  return normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
}

/**
 * Lê o `exp` do payload do token (mesmo formato de `apps/api/.../media-token.ts`)
 * e devolve o instante de expiração em ms epoch, ou `null` se ilegível. Usado pelo
 * player para renovar o token antes de expirar.
 */
export function getTokenExpiry(token: string): number | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(base64UrlToBase64(token.slice(0, separator)))) as {
      e?: unknown;
    };

    if (typeof payload.e !== 'number' || !Number.isFinite(payload.e)) {
      return null;
    }

    return payload.e * 1000;
  } catch {
    return null;
  }
}

/** Extrai o token `t` da query de uma URL. */
export function extractMediaToken(url: string): string | null {
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) {
    return null;
  }

  return new URLSearchParams(url.slice(queryIndex + 1)).get('t');
}

/** Anexa `?t=<token>` a uma URL, sem duplicar se já houver um token. */
export function appendMediaToken(url: string, token: string | null): string {
  if (!token || /[?&]t=/.test(url)) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${token}`;
}
