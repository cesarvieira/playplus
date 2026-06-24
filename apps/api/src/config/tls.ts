import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface TlsFileOptions {
  cert: Buffer;
  key: Buffer;
}

function resolveFromRepoRoot(relativePath: string): string {
  const configDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(configDir, '../../../..');
  return resolve(repoRoot, relativePath);
}

export function loadTlsFileOptions(
  certPath: string | undefined,
  keyPath: string | undefined,
): TlsFileOptions | undefined {
  if (!certPath || !keyPath) {
    return undefined;
  }

  const certFile = resolveFromRepoRoot(certPath);
  const keyFile = resolveFromRepoRoot(keyPath);

  if (!existsSync(certFile) || !existsSync(keyFile)) {
    process.stderr.write(
      [
        'Certificados TLS não encontrados.',
        `  cert: ${certFile}`,
        `  key:  ${keyFile}`,
        'Gere com mkcert — veja README (HTTPS local).',
      ].join('\n'),
    );
    process.exit(1);
  }

  return {
    cert: readFileSync(certFile),
    key: readFileSync(keyFile),
  };
}

export function isTlsEnabled(certPath: string | undefined, keyPath: string | undefined): boolean {
  return Boolean(certPath && keyPath);
}
