import { describe, expect, it } from 'vitest';

import { getAvatarUrl } from '../avatar.ts';

describe('getAvatarUrl', () => {
  it('returns a valid avatar URL for a non-empty email', () => {
    const url = getAvatarUrl('MyEmailAddress@example.com', 68);

    expect(() => new URL(url)).not.toThrow();
    expect(url).toMatch(/^https:\/\/.+/);
  });

  it('returns a valid default avatar URL for empty email', () => {
    const url = getAvatarUrl('   ', 34);

    expect(() => new URL(url)).not.toThrow();
    expect(url).toMatch(/^https:\/\/.+/);
  });
});
