import type { ApiMeResponse } from '~/utils/auth';
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

  const { ensureServerSession } = await import('~/utils/server-session.server');
  const session = await ensureServerSession(event);

  if (!session) {
    return;
  }

  try {
    const { serverApiFetch } = await import('~/utils/api-client.server');
    const me = await serverApiFetch<ApiMeResponse>(event, '/me');
    const user = mapMeResponse(me);
    authUser.value = user;

    const authStore = useAuthStore();
    authStore.user = user;
    authStore.status = 'authenticated';
  } catch {
    // middleware já validou a sessão; header usa fallback
  }
});
