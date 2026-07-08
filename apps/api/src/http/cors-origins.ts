import { env } from '#config/env';

export function isAllowedAdminOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }

  if (env.CORS_ADMIN_ORIGIN && origin === env.CORS_ADMIN_ORIGIN) {
    return true;
  }

  if (env.NODE_ENV === 'development') {
    return /^https?:\/\/(localhost|127\.0\.0\.1|[\w-]+\.playplus\.localhost)(:\d+)?$/.test(origin);
  }

  return false;
}

type CorsOriginCallback = (err: Error | null, allow: boolean | string) => void;

export function resolveCorsOrigin(origin: string | undefined, callback: CorsOriginCallback): void {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (isAllowedAdminOrigin(origin)) {
    callback(null, origin);
    return;
  }

  if (env.NODE_ENV === 'development') {
    callback(null, origin);
    return;
  }

  callback(null, false);
}
