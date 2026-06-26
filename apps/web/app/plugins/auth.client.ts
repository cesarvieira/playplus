export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore();
  const authUser = useAuthUser();

  if (authUser.value && !authStore.user) {
    authStore.user = authUser.value;
    authStore.status = 'authenticated';
  }

  if (authStore.isAuthenticated) {
    return;
  }

  const route = useRoute();

  if (route.path === '/login' && !hasClientSessionHint()) {
    return;
  }

  const hydrateSession = async () => {
    const { ensureSession } = useAuth();
    const hasSession = await ensureSession();

    if (hasSession && authStore.user) {
      authUser.value = authStore.user;
    }
  };

  // SSR sem authUser: evita mismatch de hidratação no header antes do mount
  if (nuxtApp.isHydrating && !authUser.value) {
    nuxtApp.hook('app:mounted', () => {
      void hydrateSession();
    });
    return;
  }

  await hydrateSession();
});
