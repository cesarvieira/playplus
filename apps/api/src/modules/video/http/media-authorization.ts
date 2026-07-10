import type { MediaTokenSigner } from '#infra/media/media-token';

/**
 * Autorização de requisições de mídia no gate de dev (ADR-007).
 *
 * O Caddy intercepta `storage.*` e consulta esta lógica via `forward_auth`,
 * repassando método e URI original em `X-Forwarded-Method`/`X-Forwarded-Uri`.
 * Só GET/HEAD são autorizáveis (a mídia é read-only) e o token viaja como
 * query param `?t=` em **toda** requisição — o loader do hls.js propaga o mesmo
 * token do manifesto para cada segmento (mesmo esquema no Worker de prod).
 */
export interface MediaAuthorizationInput {
  /** Método HTTP original (de X-Forwarded-Method). */
  method: string;
  /** URI original com path + query (de X-Forwarded-Uri), ex.: `/playplus/videos/{id}/hls/master.m3u8?t=...`. */
  uri: string;
  /** Bucket S3 — removido do path para obter a object key comparada ao prefixo do token. */
  bucket: string;
}

function isReadMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === 'GET' || upper === 'HEAD';
}

/** Deriva a object key (`videos/{id}/...`) a partir do URI, removendo bucket e query. */
export function extractObjectKey(uri: string, bucket: string): string | null {
  const queryIndex = uri.indexOf('?');
  const rawPath = queryIndex >= 0 ? uri.slice(0, queryIndex) : uri;

  let path: string;
  try {
    path = decodeURIComponent(rawPath).replace(/^\/+/, '');
  } catch {
    return null;
  }

  const bucketPrefix = `${bucket}/`;
  if (path.startsWith(bucketPrefix)) {
    path = path.slice(bucketPrefix.length);
  }

  return path.length > 0 ? path : null;
}

/** Extrai o token do query param `t`. */
export function extractToken(uri: string): string | null {
  const queryIndex = uri.indexOf('?');
  if (queryIndex < 0) {
    return null;
  }

  return new URLSearchParams(uri.slice(queryIndex + 1)).get('t');
}

/** Decide se a requisição de mídia pode ser servida. */
export function authorizeMediaRequest(
  signer: MediaTokenSigner,
  input: MediaAuthorizationInput,
  now: Date = new Date(),
): boolean {
  if (!isReadMethod(input.method)) {
    return false;
  }

  const objectKey = extractObjectKey(input.uri, input.bucket);
  const token = extractToken(input.uri);

  if (!objectKey || !token) {
    return false;
  }

  return signer.verify(token, objectKey, now);
}
