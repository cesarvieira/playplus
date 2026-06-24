import { clearAccessTokenCookie } from '#server/utils/access-cookie';

export default defineEventHandler((event) => {
  clearAccessTokenCookie(event);
  return { ok: true as const };
});
