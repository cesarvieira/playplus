<script setup lang="ts">
import { IconX } from '@tabler/icons-vue';

const email = ref('test@test.net');
const password = ref('');
const passwordError = ref('');
const loading = ref(false);

function simulateLogin() {
  loading.value = true;
  passwordError.value = '';

  setTimeout(() => {
    loading.value = false;
    if (password.value.length < 6) {
      passwordError.value = 'E-mail ou senha incorretos.';
    }
  }, 1200);
}

function resetForm() {
  email.value = 'test@test.net';
  password.value = '';
  passwordError.value = '';
  loading.value = false;
}
</script>

<template>
  <main class="min-h-screen bg-night-canvas p-8">
    <div class="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <h1 class="text-pl-2xl font-extrabold tracking-pl-tight text-night-text">
          Primitivos UI — Play+ Web
        </h1>
        <p class="mt-2 text-pl-sm text-night-muted">
          Demonstração dos componentes Pl* (issue #52)
        </p>
      </header>

      <!-- Buttons -->
      <section class="flex flex-col gap-4">
        <h2 class="text-pl-lg font-bold text-night-text">
          PlButton
        </h2>
        <div class="flex flex-wrap items-center gap-3">
          <PlButton variant="cta">
            CTA
          </PlButton>
          <PlButton variant="secondary">
            Secondary
          </PlButton>
          <PlButton variant="ghost">
            Ghost
          </PlButton>
          <PlButton
            variant="icon"
            aria-label="Fechar"
          >
            <IconX class="size-pl-icon-sm text-night-muted" />
          </PlButton>
          <PlButton
            variant="cta"
            :loading="loading"
            @click="simulateLogin"
          >
            Loading
          </PlButton>
          <PlButton
            variant="cta"
            disabled
          >
            Disabled
          </PlButton>
        </div>
      </section>

      <!-- Alerts -->
      <section class="flex flex-col gap-4">
        <h2 class="text-pl-lg font-bold text-night-text">
          PlAlert
        </h2>
        <PlAlert variant="error">
          E-mail ou senha incorretos.
        </PlAlert>
        <PlAlert variant="info">
          Sua sessão expirou. Faça login novamente.
        </PlAlert>
      </section>

      <!-- Form -->
      <section class="flex flex-col gap-4">
        <h2 class="text-pl-lg font-bold text-night-text">
          PlInput + PlLabel
        </h2>
        <div class="rounded-pl-xl border border-night-border-panel bg-night-panel p-6 shadow-night-panel">
          <form
            class="flex flex-col gap-4"
            @submit.prevent="simulateLogin"
          >
            <PlInput
              v-model="email"
              label="E-mail"
              type="email"
              placeholder="voce@email.com"
            />
            <PlInput
              v-model="password"
              label="Senha"
              type="password"
              placeholder="••••••••"
              :error="passwordError"
            />
            <div class="flex flex-wrap gap-3 pt-2">
              <PlButton
                type="submit"
                variant="cta"
                :loading="loading"
              >
                Entrar
              </PlButton>
              <PlButton
                type="button"
                variant="ghost"
                @click="resetForm"
              >
                Limpar
              </PlButton>
            </div>
          </form>
        </div>
      </section>

      <!-- Skeleton -->
      <section class="flex flex-col gap-4">
        <h2 class="text-pl-lg font-bold text-night-text">
          PlSkeleton
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-3 rounded-pl-lg border border-night-border-panel bg-night-card p-4">
            <p class="pl-text-muted">
              variant="text"
            </p>
            <PlSkeleton variant="text" />
            <PlSkeleton
              variant="text"
              width="70%"
            />
            <PlSkeleton
              variant="text"
              width="45%"
            />
          </div>
          <div class="flex flex-col gap-3 rounded-pl-lg border border-night-border-panel bg-night-card p-4">
            <p class="pl-text-muted">
              variant="card"
            </p>
            <PlSkeleton variant="card" />
            <PlSkeleton variant="text" />
            <PlSkeleton
              variant="text"
              width="60%"
            />
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
