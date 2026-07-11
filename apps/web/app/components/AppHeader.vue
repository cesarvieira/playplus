<script setup lang="ts">
import { IconLogout } from '@tabler/icons-vue';
import PlayLogo from '~/components/PlayLogo.vue';
import { getDisplayNameFromEmail } from '~/utils/auth';

const authStore = useAuthStore();
const authUser = useAuthUser();
const { logout } = useAuth();

const userEmail = computed(() => authUser.value?.email ?? authStore.user?.email);

const userLabel = computed(() => {
  const email = userEmail.value;

  return email ? getDisplayNameFromEmail(email) : 'Viewer';
});

const avatarUrl = computed(() => {
  const email = userEmail.value;

  return email ? getAvatarUrl(email, 68) : getAvatarUrl('', 68);
});
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-header shrink-0 items-center gap-4 border-b border-night-border-panel bg-night-surface px-7"
  >
    <div class="flex min-w-0 items-center gap-2.5">
      <PlayLogo size="sm" />
      <span class="text-pl-lg font-extrabold tracking-pl-tight text-night-text">Play+</span>
    </div>

    <nav class="ml-2 hidden items-center gap-1 sm:flex" aria-label="Principal">
      <NuxtLink
        to="/"
        class="pl-header-nav-link"
        exact-active-class="pl-header-nav-link--active"
      >
        Vídeos
      </NuxtLink>
    </nav>

    <div class="ml-auto flex min-w-0 items-center gap-2">
      <div
        class="pl-header-profile-chip min-w-0"
        :aria-label="`Perfil de ${userLabel}`"
      >
        <ClientOnly>
          <img
            :src="avatarUrl"
            alt=""
            width="34"
            height="34"
            class="size-pl-media-md shrink-0 rounded-full object-cover"
            aria-hidden="true"
          >
          <template #fallback>
            <span
              class="size-pl-media-md shrink-0 rounded-full bg-night-skeleton"
              aria-hidden="true"
            ></span>
          </template>
        </ClientOnly>
        <span class="max-w-40 truncate text-pl-sm font-bold text-night-text">
          {{ userLabel }}
        </span>
      </div>
      <button
        type="button"
        class="pl-header-logout-btn pl-focus-ring"
        title="Sair"
        aria-label="Sair"
        @click="logout"
      >
        <IconLogout class="size-pl-icon-sm" stroke="2" />
      </button>
    </div>
  </header>
</template>
