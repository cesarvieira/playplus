import type { User } from '@playplus/shared';

export function useAuthUser() {
  return useState<User | null>('auth-user', () => null);
}

/** Indício de sessão no client — não lê refresh_token (domínio API). */
export function hasClientSessionHint(): boolean {
  const authUser = useAuthUser();
  const authStore = useAuthStore();

  return authUser.value !== null || authStore.user !== null || authStore.isAuthenticated;
}
