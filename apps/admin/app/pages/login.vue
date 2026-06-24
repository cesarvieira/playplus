<script setup lang="ts">
import { ERROR_CODE } from '@playplus/shared';

import { parseApiError } from '~/utils/auth';
import { getSessionExpiredMessage, resolveErrorMessage } from '~/utils/error-messages';

definePageMeta({
  layout: 'auth',
});

const route = useRoute();
const { login, isLoading } = useAuth();

const email = ref('');
const password = ref('');
const formError = ref<string | null>(null);
const emailError = ref<string | null>(null);
const passwordError = ref<string | null>(null);

const sessionExpired = computed(() => route.query.reason === 'session_expired');

function validate(): boolean {
  emailError.value = null;
  passwordError.value = null;
  formError.value = null;

  let valid = true;
  const trimmedEmail = email.value.trim();

  if (!trimmedEmail) {
    emailError.value = 'Informe seu e-mail.';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    emailError.value = 'Informe um e-mail válido.';
    valid = false;
  }

  if (!password.value) {
    passwordError.value = 'Informe sua senha.';
    valid = false;
  } else if (password.value.length < 8) {
    passwordError.value = 'A senha deve ter pelo menos 8 caracteres.';
    valid = false;
  }

  return valid;
}

async function onSubmit() {
  if (!validate()) {
    return;
  }

  formError.value = null;

  try {
    await login(email.value.trim().toLowerCase(), password.value, route.query);
  } catch (error) {
    const apiError = parseApiError(error);

    if (apiError?.code === ERROR_CODE.UNAUTHORIZED) {
      formError.value = resolveErrorMessage(apiError.code, 'login');
      return;
    }

    if (apiError?.code === ERROR_CODE.VALIDATION_ERROR) {
      formError.value = resolveErrorMessage(apiError.code, 'default', apiError.message);
      return;
    }

    formError.value = 'Não foi possível entrar. Tente novamente.';
  }
}
</script>

<template>
  <div>
    <h1 class="text-pl-2xl font-extrabold tracking-tight text-peach-ink">Bem-vindo de volta</h1>
    <p class="mt-1.5 mb-8 text-sm font-medium text-peach-muted">Faça login para continuar.</p>

    <PlAlert v-if="sessionExpired" variant="info" :dismissible="false" class="mb-6">
      {{ getSessionExpiredMessage() }}
    </PlAlert>

    <PlAlert v-if="formError" variant="error" :dismissible="false" class="mb-6">
      {{ formError }}
    </PlAlert>

    <form class="space-y-5" novalidate @submit.prevent="onSubmit">
      <PlInput
        id="login-email"
        v-model="email"
        label="E-mail"
        type="email"
        autocomplete="email"
        :error="emailError ?? undefined"
        :disabled="isLoading"
      />

      <PlInput
        id="login-password"
        v-model="password"
        label="Senha"
        type="password"
        autocomplete="current-password"
        :error="passwordError ?? undefined"
        :disabled="isLoading"
      />

      <PlButton type="submit" class="w-full" :loading="isLoading" :disabled="isLoading">
        {{ isLoading ? 'Entrando…' : 'Entrar' }}
      </PlButton>
    </form>
  </div>
</template>
