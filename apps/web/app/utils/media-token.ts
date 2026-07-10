/**
 * Propagação do token de mídia (ADR-007) no player.
 *
 * A `stream_url` chega assinada (`.../master.m3u8?t=<token>`). As URLs de
 * playlists e segmentos do HLS são relativas e perdem a query na resolução, então
 * o loader do hls.js precisa reanexar o **mesmo** token a cada requisição — é
 * assim que o gate (Worker em prod, Caddy em dev) autoriza cada segmento.
 */

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
