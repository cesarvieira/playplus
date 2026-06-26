import Pagination from '~/components/Pagination.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

async function mountPagination(page = 1, totalPages = 3) {
  return mountSuspended(Pagination, {
    props: { page, totalPages },
    route: '/',
  });
}

describe('Pagination', () => {
  it('disables previous button on the first page', async () => {
    const wrapper = await mountPagination(1, 3);

    const previous = wrapper.find('button[aria-label="Página anterior"]');
    expect(previous.attributes('disabled')).toBeDefined();
  });

  it('disables next button on the last page', async () => {
    const wrapper = await mountPagination(3, 3);

    const next = wrapper.find('button[aria-label="Próxima página"]');
    expect(next.attributes('disabled')).toBeDefined();
  });

  it('marks the active page and exposes aria labels', async () => {
    const wrapper = await mountPagination(2, 3);

    const active = wrapper.find('button[aria-current="page"]');
    expect(active.exists()).toBe(true);
    expect(active.text()).toBe('2');
    expect(active.classes()).toContain('pl-pagination__btn--active');
    expect(wrapper.find('button[aria-label="Página 1"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Página 3"]').exists()).toBe(true);
  });

  it('emits update:page when clicking a page number', async () => {
    const wrapper = await mountPagination(1, 3);

    await wrapper.find('button[aria-label="Página 2"]').trigger('click');

    expect(wrapper.emitted('update:page')).toEqual([[2]]);
  });
});
