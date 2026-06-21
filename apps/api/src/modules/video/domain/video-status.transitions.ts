import type { VideoStatus } from '@playplus/shared';
import { VIDEO_STATUS } from '@playplus/shared';

import { InvalidVideoStatusError } from './invalid-video-status.error.ts';
import { JobAlreadyQueuedError } from './job-already-queued.error.ts';

const VALID_TRANSITIONS: Record<VideoStatus, VideoStatus[]> = {
  [VIDEO_STATUS.PENDING]: [VIDEO_STATUS.QUEUED],
  [VIDEO_STATUS.QUEUED]: [VIDEO_STATUS.PROCESSING],
  [VIDEO_STATUS.PROCESSING]: [VIDEO_STATUS.READY, VIDEO_STATUS.ERROR],
  [VIDEO_STATUS.READY]: [],
  [VIDEO_STATUS.ERROR]: [VIDEO_STATUS.QUEUED],
};

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
  const allowed = VALID_TRANSITIONS[from];

  if (!allowed.includes(to)) {
    throw new InvalidVideoStatusError(`Transição de status inválida: ${from} → ${to}`);
  }
}
