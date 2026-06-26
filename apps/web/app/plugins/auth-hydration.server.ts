import { mapMeResponse } from '~/utils/auth';
import { hasSessionCookie } from '~/utils/session-cookie';

export default defineNuxtPlugin(async () => {
  const authUser = useAuthUser();

  if (authUser.value) {
    return;
  }

  const event = useRequestEvent();

  if (!event || !hasSessionCookie(event)) {
    return;
  }

  const { ensureServerSession, getServerAccessToken } = await import('~/utils/server-session.server');
  const session = await ensureServerSession(event);

  if (!session) {
    return;
  }

  const { fetchMeWithServerSession } = await import('~~/server/utils/fetch-me.server');
  const me = await fetchMeWithServerSession(event);

  if (!me) {
    return;
  }

  const user = mapMeResponse(me);
  authUser.value = user;

  const token = await getServerAccessToken(event);

  const authStore = useAuthStore();
  authStore.user = user;
  authStore.status = 'authenticated';
  if (token) {
    authStore.accessToken = token;
  }
});
