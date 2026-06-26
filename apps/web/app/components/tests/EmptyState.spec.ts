import EmptyState from '~/components/EmptyState.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

describe('EmptyState', () => {
  it('renders default ETD copy', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      route: '/',
    });

    expect(wrapper.find('.pl-empty-state__title').text()).toBe('Nenhum vídeo disponível.');
    expect(wrapper.find('.pl-empty-state__message').text()).toBe(
      'Quando um vídeo terminar de processar, ele aparecerá aqui.',
    );
    expect(wrapper.find('.pl-empty-state__icon').exists()).toBe(true);
  });

  it('allows overriding title and message', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        title: 'Título customizado',
        message: 'Mensagem customizada',
      },
      route: '/',
    });

    expect(wrapper.find('.pl-empty-state__title').text()).toBe('Título customizado');
    expect(wrapper.find('.pl-empty-state__message').text()).toBe('Mensagem customizada');
  });
});
