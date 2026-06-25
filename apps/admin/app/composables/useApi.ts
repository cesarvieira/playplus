import type { FetchOptions } from 'ofetch';

import { apiFetch } from '~/utils/api-client';
import { buildApiFetchOptions } from '~/utils/api-fetch';
import { isUnauthorizedError } from '~/utils/auth';
import { clearAdminSessionCookie } from '~/utils/session-bridge';

type ApiOptions = Pick<FetchOptions<'json'>, 'method' | 'body' | 'headers'> & {
  _retry?: boolean;
};

async function refreshWithQueue(authStore: ReturnType<typeof useAuthStore>): Promise<boolean> {
  return await authStore.refresh();
}

export function useApi() {
  const authStore = useAuthStore();
  const { ensureSession } = useAuth();

  async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const { _retry = false, headers, method, body } = options;
    const isAuthPath = path.startsWith('/auth/');

    if (import.meta.client && !authStore.accessToken && !isAuthPath) {
      await ensureSession();
    }

    const { headers: apiHeaders } = buildApiFetchOptions(headers);

    if (import.meta.client && authStore.accessToken) {
      apiHeaders.set('Authorization', `Bearer ${authStore.accessToken}`);
    }

    try {
      return await apiFetch<T>(path, {
        method,
        body,
        headers: apiHeaders,
      });
    } catch (error) {
      if (!isAuthPath && !_retry && isUnauthorizedError(error)) {
        const refreshed = await refreshWithQueue(authStore);

        if (refreshed) {
          return api<T>(path, { ...options, _retry: true });
        }

        authStore.clearSession();

        if (import.meta.client) {
          await clearAdminSessionCookie();

          const route = useRoute();
          const redirect = encodeURIComponent(route.fullPath);
          await navigateTo(`/login?reason=session_expired&redirect=${redirect}`);
        }
      }

      throw error;
    }
  }

  return { api };
}
