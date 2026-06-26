import type { H3Event } from 'h3';

import type { SessionPayload } from '~~/server/utils/session';

export async function ensureServerSession(event: H3Event): Promise<SessionPayload | null> {
  const { ensureServerSession: ensure } = await import('~~/server/utils/session-refresh');
  return ensure(event);
}

export async function getServerAccessToken(event: H3Event): Promise<string | undefined> {
  const { getServerAccessToken: get } = await import('~~/server/utils/session-refresh');
  return get(event);
}
