import { describe, expect, it } from 'vitest';

import { VIDEO_EVENTS_CHANNEL } from '../video-events.ts';

describe('VIDEO_EVENTS_CHANNEL', () => {
  it('usa o canal documentado no ADR-002', () => {
    expect(VIDEO_EVENTS_CHANNEL).toBe('playplus:events:video');
  });
});
