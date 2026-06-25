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

  return email ? getDisplayNameFromEmail(email) : 'Admin';
});

const avatarUrl = computed(() => {
  const email = userEmail.value;

  return email ? getGravatarUrl(email, 68) : getGravatarUrl('', 68);
});
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-header shrink-0 items-center gap-4 border-b border-peach-border-light bg-peach-surface px-7"
  >
    <div class="flex items-center gap-2.5">
      <PlayLogo size="sm" />
      <span class="text-lg font-extrabold tracking-tight text-peach-ink">Play+</span>
    </div>

    <nav class="ml-2 hidden items-center gap-1 sm:flex" aria-label="Principal">
      <NuxtLink
        to="/videos"
        class="rounded-pl-md px-3 py-1.5 text-sm font-semibold text-peach-ink transition-colors hover:bg-peach-border-light"
        active-class="bg-peach-border-light"
      >
        Vídeos
      </NuxtLink>
    </nav>

    <div class="ml-auto flex items-center gap-2">
      <div
        class="flex h-10 items-center gap-2 rounded-full bg-peach-chip py-0.5 pl-0.5 pr-3.5"
        :aria-label="`Perfil de ${userLabel}`"
      >
        <ClientOnly>
          <img
            :src="avatarUrl"
            alt=""
            width="34"
            height="34"
            class="size-8.5 shrink-0 rounded-full object-cover"
            aria-hidden="true"
          >
          <template #fallback>
            <span
              class="size-8.5 shrink-0 rounded-full bg-peach-border-light"
              aria-hidden="true"
            ></span>
          </template>
        </ClientOnly>
        <span class="max-w-40 truncate text-pl-sm font-bold text-peach-ink">
          {{ userLabel }}
        </span>
      </div>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-peach-muted transition-colors hover:bg-peach-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach-accent"
        title="Sair"
        aria-label="Sair"
        @click="logout"
      >
        <IconLogout :size="18" stroke="2" />
      </button>
    </div>
  </header>
</template>
