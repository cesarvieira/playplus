import { describe, expect, it } from 'vitest';

import { VIDEO_STATUS } from '@playplus/shared';

import { InvalidVideoStatusError } from '../invalid-video-status.error.ts';
import { JobAlreadyQueuedError } from '../job-already-queued.error.ts';
import {
  assertCanEnqueueTranscode,
  assertCanRenewUploadUrl,
  assertValidStatusTransition,
} from '../video-status.transitions.ts';

describe('assertCanRenewUploadUrl', () => {
  it('permite renew quando status é pending', () => {
    expect(() => assertCanRenewUploadUrl(VIDEO_STATUS.PENDING)).not.toThrow();
  });

  it.each([VIDEO_STATUS.QUEUED, VIDEO_STATUS.PROCESSING, VIDEO_STATUS.READY, VIDEO_STATUS.ERROR])(
    'rejeita renew quando status é %s',
    (status) => {
      expect(() => assertCanRenewUploadUrl(status)).toThrow(InvalidVideoStatusError);
    },
  );
});

describe('assertCanEnqueueTranscode', () => {
  it.each([VIDEO_STATUS.PENDING, VIDEO_STATUS.ERROR])(
    'permite enqueue quando status é %s',
    (status) => {
      expect(() => assertCanEnqueueTranscode(status)).not.toThrow();
    },
  );

  it.each([VIDEO_STATUS.QUEUED, VIDEO_STATUS.PROCESSING])(
    'rejeita enqueue com JobAlreadyQueuedError quando status é %s',
    (status) => {
      expect(() => assertCanEnqueueTranscode(status)).toThrow(JobAlreadyQueuedError);
    },
  );

  it('rejeita enqueue quando status é ready', () => {
    expect(() => assertCanEnqueueTranscode(VIDEO_STATUS.READY)).toThrow(InvalidVideoStatusError);
  });
});

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
    expect(() => assertValidStatusTransition(from, to)).toThrow(InvalidVideoStatusError);
  });
});
