/**
 * Garante endpoint WS alinhado a docs/api.md (`/v1/ws`).
 * Corrige env legado `.../ws` e deriva da API quando necessário.
 */
export function resolveVideoStatusWsUrl(apiUrl: string, configuredWsUrl: string): string {
  const trimmed = configuredWsUrl.trim().replace(/\/$/, '');

  if (trimmed.endsWith('/v1/ws')) {
    return trimmed;
  }

  if (/\/ws$/.test(trimmed)) {
    return trimmed.replace(/\/ws$/, '/v1/ws');
  }

  const api = apiUrl.trim().replace(/\/$/, '');
  const httpBase = api.endsWith('/v1') ? api.slice(0, -'/v1'.length) : api;
  const wsBase = httpBase.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');

  return `${wsBase}/v1/ws`;
}
