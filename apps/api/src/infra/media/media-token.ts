import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token de acesso à mídia (ADR-007, camada 1).
 *
 * Formato: `<payload>.<signature>`, ambos base64url.
 *   payload    = base64url(JSON.stringify({ p: prefix, e: expEpochSeconds }))
 *   signature  = base64url(HMAC-SHA256(payload, secret))
 *
 * O token autoriza o **prefixo** `videos/{id}` inteiro — cobre master.m3u8,
 * playlists por qualidade, segmentos .ts e a thumbnail com uma única credencial.
 * Sem estado: a validação só depende do secret compartilhado, então o mesmo
 * esquema é reproduzível no gate de prod (Cloudflare Worker via Web Crypto) e no
 * gate de dev (esta mesma classe na API).
 */
interface MediaTokenPayload {
  /** Prefixo de storage autorizado, ex.: `videos/{id}`. */
  p: string;
  /** Expiração em epoch seconds. */
  e: number;
}

function encodePayload(payload: MediaTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encoded: string): MediaTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown;

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      typeof (parsed as MediaTokenPayload).p !== 'string' ||
      typeof (parsed as MediaTokenPayload).e !== 'number'
    ) {
      return null;
    }

    return parsed as MediaTokenPayload;
  } catch {
    return null;
  }
}

function objectKeyInPrefix(objectKey: string, prefix: string): boolean {
  return objectKey === prefix || objectKey.startsWith(`${prefix}/`);
}

export class MediaTokenSigner {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(secret: string, ttlSeconds: number) {
    this.secret = secret;
    this.ttlSeconds = ttlSeconds;
  }

  /** Assina um token curto autorizando `prefix` até `now + ttl`. */
  sign(prefix: string, now: Date = new Date()): string {
    const exp = Math.floor(now.getTime() / 1000) + this.ttlSeconds;
    const encoded = encodePayload({ p: prefix, e: exp });

    return `${encoded}.${this.signature(encoded)}`;
  }

  /**
   * Valida um token contra a chave de objeto pedida.
   * Confere assinatura (timing-safe), expiração e escopo de prefixo.
   */
  verify(token: string, objectKey: string, now: Date = new Date()): boolean {
    const separator = token.lastIndexOf('.');

    if (separator <= 0) {
      return false;
    }

    const encoded = token.slice(0, separator);
    const providedSig = token.slice(separator + 1);

    if (!this.signatureMatches(encoded, providedSig)) {
      return false;
    }

    const payload = decodePayload(encoded);

    if (!payload) {
      return false;
    }

    if (payload.e * 1000 <= now.getTime()) {
      return false;
    }

    return objectKeyInPrefix(objectKey, payload.p);
  }

  private signature(encoded: string): string {
    return createHmac('sha256', this.secret).update(encoded).digest('base64url');
  }

  private signatureMatches(encoded: string, providedSig: string): boolean {
    const expected = Buffer.from(this.signature(encoded), 'base64url');
    const provided = Buffer.from(providedSig, 'base64url');

    if (expected.length !== provided.length || expected.length === 0) {
      return false;
    }

    return timingSafeEqual(expected, provided);
  }
}
