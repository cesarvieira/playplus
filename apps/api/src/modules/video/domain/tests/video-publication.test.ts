import { describe, expect, it } from 'vitest';
import { ValidationError } from '@playplus/shared';

import { assertScheduleDateIsFuture, isCatalogVisible } from '../video-publication.ts';

describe('isCatalogVisible', () => {
  const now = new Date('2026-07-04T12:00:00.000Z');

  it('retorna false quando publishedAt é null', () => {
    expect(isCatalogVisible(null, now)).toBe(false);
  });

  it('retorna false quando publishedAt é futuro', () => {
    expect(isCatalogVisible(new Date('2026-07-05T12:00:00.000Z'), now)).toBe(false);
  });

  it('retorna true quando publishedAt é no passado', () => {
    expect(isCatalogVisible(new Date('2026-07-03T12:00:00.000Z'), now)).toBe(true);
  });

  it('retorna true quando publishedAt é exatamente now', () => {
    expect(isCatalogVisible(new Date('2026-07-04T12:00:00.000Z'), now)).toBe(true);
  });
});

describe('assertScheduleDateIsFuture', () => {
  const now = new Date('2026-07-04T12:00:00.000Z');

  it('não lança quando publishedAt é futuro', () => {
    expect(() =>
      assertScheduleDateIsFuture(new Date('2026-07-05T12:00:00.000Z'), now),
    ).not.toThrow();
  });

  it('lança ValidationError quando publishedAt é no passado', () => {
    expect(() =>
      assertScheduleDateIsFuture(new Date('2026-07-03T12:00:00.000Z'), now),
    ).toThrow(ValidationError);
  });

  it('lança ValidationError quando publishedAt é igual a now', () => {
    expect(() =>
      assertScheduleDateIsFuture(new Date('2026-07-04T12:00:00.000Z'), now),
    ).toThrow(ValidationError);
  });
});
