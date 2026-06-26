import LoadingSkeleton from '~/components/LoadingSkeleton.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

describe('LoadingSkeleton', () => {
  it('renders four skeleton cards inside an aria-hidden grid', async () => {
    const wrapper = await mountSuspended(LoadingSkeleton, {
      route: '/',
    });

    const grid = wrapper.find('.pl-catalog-grid.pl-catalog-grid--skeleton');
    expect(grid.exists()).toBe(true);
    expect(grid.attributes('aria-hidden')).toBe('true');
    expect(wrapper.findAll('.pl-catalog-skeleton')).toHaveLength(4);
  });
});
