import { describe, expect, it } from 'vitest';

import { VIDEO_RATING } from '@playplus/shared';

import { videoRatingEnum } from '../videos.ts';

describe('videoRatingEnum', () => {
  it('espelha exatamente os valores de VIDEO_RATING do shared', () => {
    // Guarda contra drift entre o contrato compartilhado (#72) e o enum do banco.
    expect([...videoRatingEnum.enumValues].sort()).toEqual(Object.values(VIDEO_RATING).sort());
  });
});
