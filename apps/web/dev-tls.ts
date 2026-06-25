import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadDevTlsHttps(): {
  key: string;
  cert: string;
} | undefined {
  const certPath = process.env.DEV_TLS_CERT;
  const keyPath = process.env.DEV_TLS_KEY;

  if (!certPath || !keyPath) {
    return undefined;
  }

  const webRoot = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(webRoot, '../..');
  const certFile = resolve(repoRoot, certPath);
  const keyFile = resolve(repoRoot, keyPath);

  if (!existsSync(certFile) || !existsSync(keyFile)) {
    return undefined;
  }

  return {
    key: readFileSync(keyFile, 'utf8'),
    cert: readFileSync(certFile, 'utf8'),
  };
}

export function isDevTlsEnabled(): boolean {
  return loadDevTlsHttps() !== undefined;
}

/** URL pública do viewer (apps/web) — usada como siteUrl neste app. */
export function resolveWebSiteUrl(): string {
  if (process.env.NUXT_PUBLIC_WEB_URL) {
    return process.env.NUXT_PUBLIC_WEB_URL;
  }

  return isDevTlsEnabled()
    ? 'https://web.playplus.localhost:3001'
    : 'http://localhost:3001';
}
