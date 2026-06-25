export default defineNuxtPlugin(async () => {
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

  const { ensureSession } = useAuth();
  const hasSession = await ensureSession();

  if (hasSession) {
    if (authStore.user) {
      authUser.value = authStore.user;
    }
  }
});
