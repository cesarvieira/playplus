const GOOGLE_FONTS_STYLE = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FONT = 'https://fonts.gstatic.com';

function tryOrigin(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildConnectSrc(isDev: boolean): string[] {
  const sources = new Set<string>(['\'self\'']);

  const apiOrigin = tryOrigin(process.env.NUXT_PUBLIC_API_URL);
  const wsOrigin = tryOrigin(process.env.NUXT_PUBLIC_WS_URL);
  const storageOrigin = tryOrigin(process.env.STORAGE_ENDPOINT);

  if (apiOrigin) {
    sources.add(apiOrigin);
  }

  if (wsOrigin) {
    sources.add(wsOrigin);
  }

  if (storageOrigin) {
    sources.add(storageOrigin);
  }

  if (isDev) {
    // HMR do dev server trafega pelo Caddy: wss para o próprio host do admin.
    sources.add('wss://admin.playplus.localhost');
  }

  return [...sources];
}

export function createContentSecurityPolicy(isDev: boolean) {
  const connectSrc = buildConnectSrc(isDev);

  if (isDev) {
    return {
      'default-src': ['\'self\''],
      'script-src': ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''],
      'style-src': ['\'self\'', '\'unsafe-inline\'', GOOGLE_FONTS_STYLE],
      'font-src': ['\'self\'', GOOGLE_FONTS_FONT, 'data:'],
      'img-src': ['\'self\'', 'data:', 'blob:', 'https:'],
      'connect-src': connectSrc,
      'frame-ancestors': ['\'none\''],
      'base-uri': ['\'self\''],
      'form-action': ['\'self\''],
    };
  }

  return {
    'default-src': ['\'self\''],
    'script-src': ['\'self\'', '\'strict-dynamic\'', '\'nonce-{{nonce}}\''],
    'style-src': ['\'self\'', '\'nonce-{{nonce}}\'', GOOGLE_FONTS_STYLE],
    'font-src': ['\'self\'', GOOGLE_FONTS_FONT, 'data:'],
    'img-src': ['\'self\'', 'data:', 'blob:', 'https:'],
    'connect-src': connectSrc,
    'frame-ancestors': ['\'none\''],
    'base-uri': ['\'self\''],
    'form-action': ['\'self\''],
  };
}

export function createSecurityHeaders(isDev: boolean) {
  return {
    crossOriginEmbedderPolicy: false as const,
    crossOriginOpenerPolicy: 'same-origin' as const,
    crossOriginResourcePolicy: 'same-origin' as const,
    originAgentCluster: '?1' as const,
    referrerPolicy: 'strict-origin-when-cross-origin' as const,
    strictTransportSecurity: isDev
      ? (false as const)
      : {
          maxAge: 15552000,
          includeSubdomains: true,
        },
    xContentTypeOptions: 'nosniff' as const,
    xDNSPrefetchControl: 'off' as const,
    xDownloadOptions: 'noopen' as const,
    xFrameOptions: 'DENY' as const,
    xPermittedCrossDomainPolicies: 'none' as const,
    xXSSProtection: '0' as const,
    contentSecurityPolicy: createContentSecurityPolicy(isDev),
  };
}
