/**
 * Presets de rate limit por perfil de rota, em requisições por janela, por
 * chave (ver rate-limit-key.ts). São pontos de partida conservadores — não
 * foram calibrados com tráfego real, ajuste os números conforme observar o
 * uso de produção.
 */
export const RATE_LIMIT_READ = { max: 300, timeWindow: '1 minute' } as const;

export const RATE_LIMIT_WRITE = { max: 60, timeWindow: '1 minute' } as const;

export const RATE_LIMIT_SENSITIVE_WRITE = { max: 30, timeWindow: '1 minute' } as const;
