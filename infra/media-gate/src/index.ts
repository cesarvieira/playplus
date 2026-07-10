/**
 * Play+ — Media Gate (ADR-007, camada 1) — Cloudflare Worker de produção.
 *
 * Fica na frente de um bucket R2 **privado** (sem binding público `r2.dev`) e só
 * serve um objeto após validar o token `?t=` assinado pela API. Reproduz, com Web
 * Crypto, o mesmo esquema HMAC-SHA256 de `apps/api/src/infra/media/media-token.ts`:
 *
 *   token   = `<payload>.<signature>` (ambos base64url)
 *   payload = base64url(JSON.stringify({ p: prefix, e: expEpochSeconds }))
 *   sig     = base64url(HMAC-SHA256(payload, MEDIA_TOKEN_SECRET))
 *
 * O token autoriza o prefixo `videos/{id}` inteiro; o loader do hls.js propaga o
 * mesmo token do manifesto para cada segmento. O cache de borda usa uma chave que
 * ignora o `?t=`, então segmentos são cacheáveis apesar do token variar por emissão.
 */

export interface Env {
  MEDIA_BUCKET: R2Bucket;
  MEDIA_TOKEN_SECRET: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacBase64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bytesToBase64Url(signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function objectKeyInPrefix(objectKey: string, prefix: string): boolean {
  return objectKey === prefix || objectKey.startsWith(`${prefix}/`);
}

async function isTokenValid(
  secret: string,
  token: string,
  objectKey: string,
  now: number,
): Promise<boolean> {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) {
    return false;
  }

  const encoded = token.slice(0, separator);
  const providedSig = token.slice(separator + 1);
  const expectedSig = await hmacBase64Url(secret, encoded);

  if (!timingSafeEqual(expectedSig, providedSig)) {
    return false;
  }

  let payload: { p?: unknown; e?: unknown };
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(encoded)));
  } catch {
    return false;
  }

  if (typeof payload.p !== 'string' || typeof payload.e !== 'number') {
    return false;
  }

  if (payload.e * 1000 <= now) {
    return false;
  }

  return objectKeyInPrefix(objectKey, payload.p);
}

/** Chave de cache sem o token, para não fragmentar o cache por emissão. */
function cacheKeyFor(request: Request, url: URL): Request {
  const canonical = new URL(url.toString());
  canonical.searchParams.delete('t');
  return new Request(canonical.toString(), { method: 'GET' });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const objectKey = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const token = url.searchParams.get('t');

    if (!objectKey || !token) {
      return new Response('Forbidden', { status: 403 });
    }

    if (!(await isTokenValid(env.MEDIA_TOKEN_SECRET, token, objectKey, Date.now()))) {
      return new Response('Forbidden', { status: 403 });
    }

    const cache = caches.default;
    const cacheKey = cacheKeyFor(request, url);
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const object = await env.MEDIA_BUCKET.get(objectKey);
    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    // .m3u8 muda a cada re-transcode; segmentos são imutáveis.
    headers.set(
      'cache-control',
      objectKey.endsWith('.m3u8') ? 'public, max-age=10' : 'public, max-age=31536000, immutable',
    );

    const response = new Response(object.body, { headers });
    if (request.method === 'GET') {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  },
};
