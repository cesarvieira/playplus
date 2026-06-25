import { mountSuspended } from '@nuxt/test-utils/runtime';

import { useApi } from '~/composables/useApi';
import { useAuth } from '~/composables/useAuth';
import { useAuthStore } from '~/stores/auth';

type AuthStore = ReturnType<typeof useAuthStore>;

export async function withAuthStore<T>(run: (store: AuthStore) => Promise<T>): Promise<T> {
  let store!: AuthStore;

  await mountSuspended({
    setup() {
      store = useAuthStore();
      store.clearSession();
    },
    template: '<div />',
  });

  return run(store);
}

export async function withAuth<T>(run: (auth: ReturnType<typeof useAuth>) => Promise<T>): Promise<T> {
  let auth!: ReturnType<typeof useAuth>;

  await mountSuspended({
    setup() {
      auth = useAuth();
      useAuthStore().clearSession();
    },
    template: '<div />',
  });

  return run(auth);
}

export async function withApiContext<T>(
  run: (ctx: { store: AuthStore; api: ReturnType<typeof useApi>['api'] }) => Promise<T>,
): Promise<T> {
  let store!: AuthStore;
  let apiFn!: ReturnType<typeof useApi>['api'];

  await mountSuspended({
    setup() {
      store = useAuthStore();
      store.clearSession();
      apiFn = useApi().api;
    },
    template: '<div />',
  });

  return run({ store, api: apiFn });
}
