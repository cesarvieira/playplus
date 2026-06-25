import type { LocationQuery } from 'vue-router';

import { resolvePostLoginRedirect } from '~/utils/auth';

export function useAuth() {
  const authStore = useAuthStore();

  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isLoading = computed(() => authStore.status === 'loading');

  async function ensureSession(): Promise<boolean> {
    if (authStore.isAuthenticated) {
      return true;
    }

    return authStore.refresh();
  }

  async function login(email: string, password: string, query?: LocationQuery) {
    await authStore.login({ email, password });
    const authUser = useAuthUser();
    if (authStore.user) {
      authUser.value = authStore.user;
    }
    const redirectQuery = query ?? (import.meta.client ? useRoute().query : {});
    await navigateTo(resolvePostLoginRedirect(redirectQuery));
  }

  async function logout() {
    await authStore.logout();
    useAuthUser().value = null;
    await navigateTo('/login');
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    ensureSession,
    resolvePostLoginRedirect,
  };
}
