import type { VideoStatus } from '@playplus/shared';
import {
  InvalidVideoStatusTransitionError,
  VIDEO_STATUS,
  assertValidStatusTransition as assertValidStatusTransitionShared,
} from '@playplus/shared';

import { InvalidVideoStatusError } from './invalid-video-status.error.ts';
import { JobAlreadyQueuedError } from './job-already-queued.error.ts';

export function assertCanRenewUploadUrl(status: VideoStatus): void {
  if (status !== VIDEO_STATUS.PENDING) {
    throw new InvalidVideoStatusError(
      'Renovação de URL de upload permitida apenas para vídeos pendentes',
    );
  }
}

export function assertCanEnqueueTranscode(status: VideoStatus): void {
  if (status === VIDEO_STATUS.QUEUED || status === VIDEO_STATUS.PROCESSING) {
    throw new JobAlreadyQueuedError();
  }

  if (status !== VIDEO_STATUS.PENDING && status !== VIDEO_STATUS.ERROR) {
    throw new InvalidVideoStatusError(
      'Transcodificação permitida apenas para vídeos pendentes ou com erro',
    );
  }
}

export function assertValidStatusTransition(from: VideoStatus, to: VideoStatus): void {
  try {
    assertValidStatusTransitionShared(from, to);
  } catch (error) {
    if (error instanceof InvalidVideoStatusTransitionError) {
      throw new InvalidVideoStatusError(error.message);
    }

    throw error;
  }
}
