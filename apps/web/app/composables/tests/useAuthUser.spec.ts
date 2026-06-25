import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

import { hasClientSessionHint, useAuthUser } from '~/composables/useAuthUser';

describe('useAuthUser', () => {
  it('inicia estado compartilhado como null', async () => {
    await mountSuspended({
      setup() {
        expect(useAuthUser().value).toBeNull();
      },
      template: '<div />',
    });
  });

  it('hasClientSessionHint detecta authUser SSR', async () => {
    await mountSuspended({
      setup() {
        useAuthUser().value = {
          id: 'user-1',
          email: 'viewer@playplus.localhost',
          role: 'viewer',
          createdAt: '2025-01-01T00:00:00Z',
        };

        expect(hasClientSessionHint()).toBe(true);
      },
      template: '<div />',
    });
  });

  it('hasClientSessionHint detecta store autenticado', async () => {
    await mountSuspended({
      setup() {
        const store = useAuthStore();
        store.accessToken = 'token';

        expect(hasClientSessionHint()).toBe(true);
      },
      template: '<div />',
    });
  });

  it('hasClientSessionHint retorna false sem indícios de sessão', async () => {
    await mountSuspended({
      setup() {
        useAuthStore().clearSession();
        useAuthUser().value = null;

        expect(hasClientSessionHint()).toBe(false);
      },
      template: '<div />',
    });
  });
});
