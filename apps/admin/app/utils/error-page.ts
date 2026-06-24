import type { NuxtError } from '#app';

export type ErrorPageVariant = '500' | '404' | 'offline';

export interface ErrorPageContent {
  code: string;
  headline: string;
  body: string;
  footnote: string;
  pill: string;
}

export interface ErrorDevDetails {
  name: string;
  message: string;
  stackLines: string[];
  statusCode: number | string;
  route: string;
  timestamp: string;
}

export const ERROR_PAGE_CONTENT: Record<ErrorPageVariant, ErrorPageContent> = {
  500: {
    code: '500',
    headline: 'A projeção travou.',
    body: 'Algo deu errado nos bastidores — mas não foi culpa sua. Já estamos rebobinando o filme por aqui.',
    footnote: 'Seus vídeos estão a salvo. Nada foi perdido. Tente de novo em alguns instantes.',
    pill: 'Sala de projeção fora do ar',
  },
  404: {
    code: '404',
    headline: 'Essa cena não existe.',
    body: 'Procuramos em todos os filmes e não achamos essa cena. Talvez ela tenha ido pro corte final.',
    footnote: 'Confira a sala de projeção ou volte para a bilheteria.',
    pill: 'Página não encontrada',
  },
  offline: {
    code: '⚡',
    headline: 'Perdemos o sinal.',
    body: 'Sua conexão deu uma pausa no meio do filme. Assim que ela voltar, é só continuar de onde parou.',
    footnote: 'Verifique sua internet — a gente espera você voltar.',
    pill: 'Sem conexão',
  },
};

const OFFLINE_MESSAGE_HINTS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'load failed',
  'connection timed out',
  'err_internet_disconnected',
  'err_network_changed',
] as const;

export function isOfflineError(error: Pick<NuxtError, 'statusCode' | 'message'>): boolean {
  const message = (error.message ?? '').toLowerCase();

  if (error.statusCode === 0) {
    return true;
  }

  return OFFLINE_MESSAGE_HINTS.some(hint => message.includes(hint));
}

export function resolveErrorPageVariant(
  error: Pick<NuxtError, 'statusCode' | 'message'>,
): ErrorPageVariant {
  if (isOfflineError(error)) {
    return 'offline';
  }

  if (error.statusCode === 404) {
    return '404';
  }

  return '500';
}

export function parseStackLines(stack?: string, limit = 3): string[] {
  if (!stack) {
    return [];
  }

  return stack
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('at '))
    .map(line => line.replace(/^at\s+/, ''))
    .slice(0, limit);
}

export function buildErrorDevDetails(error: NuxtError, route = '/'): ErrorDevDetails {
  const err = error.cause instanceof Error ? error.cause : null;

  return {
    name: err?.name ?? error.name ?? 'Error',
    message: err?.message ?? error.message ?? error.statusMessage ?? 'Unknown error',
    stackLines: parseStackLines(err?.stack ?? error.stack),
    statusCode: error.statusCode ?? '—',
    route,
    timestamp: new Date().toISOString(),
  };
}

export function formatErrorDevDetails(details: ErrorDevDetails): string {
  const stack = details.stackLines.map(line => `at ${line}`).join('\n');

  return [
    `${details.name}: ${details.message}`,
    stack,
    '',
    `statusCode: ${details.statusCode}`,
    `route: ${details.route}`,
    `timestamp: ${details.timestamp}`,
  ]
    .filter(Boolean)
    .join('\n');
}
