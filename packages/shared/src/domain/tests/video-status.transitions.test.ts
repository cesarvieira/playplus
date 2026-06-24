import { describe, expect, it } from 'vitest';

import { VIDEO_STATUS } from '../../enums/video-status.ts';
import { InvalidVideoStatusTransitionError } from '../../errors/invalid-video-status-transition.error.ts';
import { assertValidStatusTransition } from '../video-status.transitions.ts';

describe('assertValidStatusTransition', () => {
  it.each([
    [VIDEO_STATUS.PENDING, VIDEO_STATUS.QUEUED],
    [VIDEO_STATUS.QUEUED, VIDEO_STATUS.PROCESSING],
    [VIDEO_STATUS.PROCESSING, VIDEO_STATUS.READY],
    [VIDEO_STATUS.PROCESSING, VIDEO_STATUS.ERROR],
    [VIDEO_STATUS.ERROR, VIDEO_STATUS.QUEUED],
  ])('permite transição %s → %s', (from, to) => {
    expect(() => assertValidStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    [VIDEO_STATUS.READY, VIDEO_STATUS.QUEUED],
    [VIDEO_STATUS.PENDING, VIDEO_STATUS.READY],
    [VIDEO_STATUS.QUEUED, VIDEO_STATUS.READY],
  ])('rejeita transição inválida %s → %s', (from, to) => {
    expect(() => assertValidStatusTransition(from, to)).toThrow(InvalidVideoStatusTransitionError);
  });
});
