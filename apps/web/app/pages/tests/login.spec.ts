import LoginPage from '~/pages/login.vue';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

const { ofetchMock, navigateToMock, useRouteMock } = vi.hoisted(() => ({
  ofetchMock: vi.fn(),
  navigateToMock: vi.fn().mockResolvedValue(undefined),
  useRouteMock: vi.fn(() => ({
    path: '/login',
    fullPath: '/login',
    query: {} as Record<string, string>,
  })),
}));

vi.mock('ofetch', () => ({
  ofetch: ofetchMock,
}));

vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ ok: true }));

mockNuxtImport('navigateTo', () => navigateToMock);
mockNuxtImport('useRoute', () => useRouteMock);

const meResponse = {
  id: 'user-1',
  email: 'viewer@playplus.localhost',
  role: 'viewer' as const,
  created_at: '2025-01-01T00:00:00Z',
};

function mockLoginSuccess() {
  ofetchMock
    .mockResolvedValueOnce({ access_token: 'access-token', expires_in: 900 })
    .mockResolvedValueOnce(meResponse);
}

async function mountLogin() {
  const { mountSuspended } = await import('@nuxt/test-utils/runtime');

  return mountSuspended(LoginPage, {
    route: '/login',
  });
}

async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountLogin>>,
  email = 'viewer@playplus.localhost',
  password = 'password123',
) {
  await wrapper.find('#login-email').setValue(email);
  await wrapper.find('#login-password').setValue(password);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('login page', () => {
  beforeEach(() => {
    ofetchMock.mockReset();
    navigateToMock.mockClear();
    useRouteMock.mockReturnValue({
      path: '/login',
      fullPath: '/login',
      query: {},
    });
  });

  it('renders default state without forgot password link', async () => {
    const wrapper = await mountLogin();

    expect(wrapper.text()).toContain('Bem-vindo de volta');
    expect(wrapper.text()).toContain('Faça login para continuar.');
    expect(wrapper.text()).toContain('Entrar');
    expect(wrapper.text()).not.toContain('Esqueceu a senha');
    expect(wrapper.find('#login-email').exists()).toBe(true);
    expect(wrapper.find('#login-password').exists()).toBe(true);
  });

  it('shows session expired alert when reason query is session_expired', async () => {
    useRouteMock.mockReturnValue({
      path: '/login',
      fullPath: '/login?reason=session_expired',
      query: { reason: 'session_expired' },
    });

    const wrapper = await mountLogin();

    expect(wrapper.text()).toContain('Sua sessão expirou. Faça login novamente.');
  });

  it('validates fields on empty submit without calling API', async () => {
    const wrapper = await mountLogin();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Informe seu e-mail.');
    expect(wrapper.text()).toContain('Informe sua senha.');
    expect(ofetchMock).not.toHaveBeenCalled();
  });

  it('shows credential error alert and invalid password input on 401', async () => {
    ofetchMock.mockRejectedValueOnce({
      data: {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      },
    });

    const wrapper = await mountLogin();
    await fillAndSubmit(wrapper);

    expect(wrapper.text()).toContain('E-mail ou senha incorretos.');

    const passwordInput = wrapper.find('#login-password');
    expect(passwordInput.attributes('aria-invalid')).toBe('true');
    expect(passwordInput.classes()).toContain('pl-input--error');
  });

  it('shows loading state with Entrando label and disabled fields', async () => {
    let resolveLogin: ((value: unknown) => void) | undefined;
    ofetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    const wrapper = await mountLogin();
    await wrapper.find('#login-email').setValue('viewer@playplus.localhost');
    await wrapper.find('#login-password').setValue('password123');
    const submitPromise = wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Entrando…');
    expect(wrapper.find('#login-email').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#login-password').attributes('disabled')).toBeDefined();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.pl-spinner').exists()).toBe(true);

    resolveLogin?.({ access_token: 'access-token', expires_in: 900 });
    ofetchMock.mockResolvedValueOnce(meResponse);
    await submitPromise;
    await flushPromises();
  });

  it('redirects to home after successful login', async () => {
    mockLoginSuccess();

    const wrapper = await mountLogin();
    await fillAndSubmit(wrapper);

    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('honors safe redirect query after successful login', async () => {
    mockLoginSuccess();
    useRouteMock.mockReturnValue({
      path: '/login',
      fullPath: '/login?redirect=%2Fabc123',
      query: { redirect: '/abc123' },
    });

    const wrapper = await mountLogin();
    await fillAndSubmit(wrapper);

    expect(navigateToMock).toHaveBeenCalledWith('/abc123');
  });
});
