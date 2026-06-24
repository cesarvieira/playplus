import { resolvePostLoginRedirect } from '~/utils/auth';
import { hasSessionCookie } from '~/utils/session-cookie';

async function hasActiveSession(isLoginPage: boolean): Promise<boolean> {
  if (import.meta.server) {
    const event = useRequestEvent();

    if (!event) {
      return false;
    }

    if (!hasSessionCookie(event)) {
      return false;
    }

    const { ensureServerSession } = await import('~/utils/server-session.server');
    const session = await ensureServerSession(event);
    return session !== null;
  }

  const authStore = useAuthStore();

  if (authStore.isAuthenticated) {
    return true;
  }

  // F5: SSR já validou rotas protegidas — evita redirect antes da hidratação
  if (!isLoginPage && useNuxtApp().isHydrating) {
    return true;
  }

  // Login: só tenta refresh se houve sessão SSR (cookie admin)
  if (isLoginPage && !hasClientSessionHint()) {
    return false;
  }

  const { ensureSession } = useAuth();
  return ensureSession();
}

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore();
  const isLoginPage = to.path === '/login';

  if (isLoginPage) {
    if (import.meta.client && authStore.isAuthenticated) {
      return navigateTo(resolvePostLoginRedirect(to.query));
    }

    const sessionActive = await hasActiveSession(true);

    if (sessionActive) {
      return navigateTo(resolvePostLoginRedirect(to.query));
    }

    return;
  }

  const sessionActive = await hasActiveSession(false);

  if (!sessionActive) {
    const redirect = encodeURIComponent(to.fullPath);
    return navigateTo(`/login?redirect=${redirect}`);
  }
});
