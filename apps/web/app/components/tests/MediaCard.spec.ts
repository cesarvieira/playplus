import MediaCard from '~/components/MediaCard.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

import type { VideoListItem } from '~/utils/videos';

const baseVideo: VideoListItem = {
  id: 'a',
  title: 'Férias na Serra 2024',
  duration: 724,
  thumbnail_url: null,
  status: 'ready',
  created_at: '2026-05-28T12:00:00.000Z',
};

async function mountMediaCard(video: VideoListItem = baseVideo) {
  return mountSuspended(MediaCard, {
    props: { video },
    route: '/',
  });
}

describe('MediaCard', () => {
  it('renders a link to the player route', async () => {
    const wrapper = await mountMediaCard();

    const link = wrapper.find('a.pl-media-card');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe(`/${baseVideo.id}`);
  });

  it('shows gradient placeholder and claquete icon without thumbnail', async () => {
    const wrapper = await mountMediaCard();

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('.pl-media-card__placeholder-icon').exists()).toBe(true);
    expect(wrapper.find('.pl-media-card__play').exists()).toBe(false);
    expect(wrapper.find('.pl-media-card__thumb').classes()).toContain('bg-placeholder-neutral');
  });

  it('renders thumbnail with decorative alt and play overlay', async () => {
    const wrapper = await mountMediaCard({
      ...baseVideo,
      thumbnail_url: 'https://cdn.example.com/thumb.jpg',
    });

    const image = wrapper.find('img');
    expect(image.exists()).toBe(true);
    expect(image.attributes('alt')).toBe('');
    expect(image.attributes('src')).toBe('https://cdn.example.com/thumb.jpg');
    expect(wrapper.find('.pl-media-card__play').exists()).toBe(true);
    expect(wrapper.find('.pl-media-card__placeholder-icon').exists()).toBe(false);
  });

  it('formats meta line with date and duration', async () => {
    const wrapper = await mountMediaCard();

    expect(wrapper.find('.pl-media-card__meta').text()).toBe('28 mai 2026 · 12:04');
    expect(wrapper.find('.pl-media-card__duration').text()).toBe('12:04');
    expect(wrapper.find('.pl-media-card__title').text()).toBe(baseVideo.title);
  });
});
