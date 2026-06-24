import { hasSessionCookie } from '~/utils/session-cookie';

import { ensureServerSession } from '../utils/session-refresh';

const PUBLIC_PATH_PREFIXES = ['/login'] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;

  if (isPublicPath(pathname)) {
    return;
  }

  if (!hasSessionCookie(event)) {
    return;
  }

  await ensureServerSession(event);
});
