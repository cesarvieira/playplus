import { describe, expect, it } from 'vitest';

import { VIDEO_RATING } from '../video-rating.ts';

describe('VIDEO_RATING', () => {
  it('contém os 6 níveis de classificação indicativa', () => {
    expect(VIDEO_RATING.L).toBe('livre');
    expect(VIDEO_RATING.AGE_10).toBe('10');
    expect(VIDEO_RATING.AGE_12).toBe('12');
    expect(VIDEO_RATING.AGE_14).toBe('14');
    expect(VIDEO_RATING.AGE_16).toBe('16');
    expect(VIDEO_RATING.AGE_18).toBe('18');
  });
});
