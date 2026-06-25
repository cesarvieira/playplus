import type { LoginDto, User } from '@playplus/shared';
import { defineStore } from 'pinia';
import { ofetch } from 'ofetch';

import { type ApiAuthResponse, type ApiMeResponse, mapMeResponse } from '~/utils/auth';
import { clearAdminSessionCookie, persistAuthResponse } from '~/utils/session-bridge';

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig();

  const accessToken = ref<string | null>(null);
  const user = ref<User | null>(null);
  const status = ref<'idle' | 'loading' | 'authenticated'>('idle');

  const isAuthenticated = computed(() => accessToken.value !== null);

  function clearSession() {
    accessToken.value = null;
    user.value = null;
    status.value = 'idle';
  }

  async function fetchMe() {
    const data = await ofetch<ApiMeResponse>('/me', {
      baseURL: config.public.apiUrl,
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
      },
    });

    user.value = mapMeResponse(data);
    status.value = 'authenticated';
  }

  async function login(loginDto: LoginDto) {
    status.value = 'loading';

    try {
      const data = await ofetch<ApiAuthResponse>('/auth/login', {
        method: 'POST',
        body: loginDto,
        baseURL: config.public.apiUrl,
        credentials: 'include',
      });

      const { accessToken: token } = await persistAuthResponse(data);
      accessToken.value = token;
      await fetchMe();
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  async function doRefresh(): Promise<boolean> {
    try {
      const data = await ofetch<ApiAuthResponse>('/auth/refresh', {
        method: 'POST',
        baseURL: config.public.apiUrl,
        credentials: 'include',
      });

      const { accessToken: token } = await persistAuthResponse(data);
      accessToken.value = token;

      if (!user.value) {
        await fetchMe();
      } else {
        status.value = 'authenticated';
      }

      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  let refreshInFlight: Promise<boolean> | null = null;

  async function refresh(): Promise<boolean> {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      try {
        return await doRefresh();
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }

  async function logout() {
    try {
      await ofetch('/auth/logout', {
        method: 'POST',
        baseURL: config.public.apiUrl,
        credentials: 'include',
        headers: accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : undefined,
      });
    } finally {
      await clearAdminSessionCookie();
      clearSession();
    }
  }

  return {
    accessToken,
    user,
    status,
    isAuthenticated,
    login,
    logout,
    refresh,
    fetchMe,
    clearSession,
  };
});
