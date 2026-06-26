import CatalogGrid from '~/components/CatalogGrid.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

import type { VideoListItem } from '~/utils/videos';

const videos: VideoListItem[] = [
  {
    id: 'video-1',
    title: 'Primeiro vídeo',
    duration: 120,
    thumbnail_url: null,
    status: 'ready',
    created_at: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 'video-2',
    title: 'Segundo vídeo',
    duration: 240,
    thumbnail_url: 'https://cdn.example.com/2.jpg',
    status: 'ready',
    created_at: '2026-05-02T10:00:00.000Z',
  },
];

describe('CatalogGrid', () => {
  it('renders one MediaCard per video', async () => {
    const wrapper = await mountSuspended(CatalogGrid, {
      props: { videos },
      route: '/',
    });

    const cards = wrapper.findAll('a.pl-media-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.attributes('href')).toBe('/video-1');
    expect(cards[1]?.attributes('href')).toBe('/video-2');
    expect(wrapper.find('.pl-catalog-grid').exists()).toBe(true);
  });
});
