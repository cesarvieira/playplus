import { describe, expect, it } from 'vitest';

import {
  PLACEHOLDER_GRADIENT_CLASSES,
  formatDate,
  formatDuration,
  gradientForVideoId,
} from '../format';

describe('formatDate', () => {
  it('formats an ISO date in pt-BR catalog style', () => {
    expect(formatDate('2026-05-28T12:00:00.000Z')).toBe('28 mai 2026');
  });

  it('returns Invalid Date for unparseable values', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(724)).toBe('12:04');
  });

  it('formats hours when necessário', () => {
    expect(formatDuration(7240)).toBe('2:00:40');
  });

  it('returns null for invalid values', () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(-1)).toBeNull();
  });
});

describe('gradientForVideoId', () => {
  it('returns a known placeholder gradient class', () => {
    expect(PLACEHOLDER_GRADIENT_CLASSES).toContain(gradientForVideoId('video-abc'));
  });

  it('is deterministic for the same id', () => {
    const first = gradientForVideoId('550e8400-e29b-41d4-a716-446655440000');
    const second = gradientForVideoId('550e8400-e29b-41d4-a716-446655440000');

    expect(first).toBe(second);
  });

  it('maps fixed ids to expected classes', () => {
    expect(gradientForVideoId('a')).toBe('bg-placeholder-neutral');
    expect(gradientForVideoId('b')).toBe('bg-placeholder-lavender');
    expect(gradientForVideoId('c')).toBe('bg-placeholder-green');
  });
});
