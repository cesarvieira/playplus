import { VIDEO_STATUS, type VideoStatus } from '../enums/video-status.js';
import { InvalidVideoStatusTransitionError } from '../errors/invalid-video-status-transition.error.js';

export const VALID_TRANSITIONS: Record<VideoStatus, VideoStatus[]> = {
  [VIDEO_STATUS.PENDING]: [VIDEO_STATUS.QUEUED],
  [VIDEO_STATUS.QUEUED]: [VIDEO_STATUS.PROCESSING],
  [VIDEO_STATUS.PROCESSING]: [VIDEO_STATUS.READY, VIDEO_STATUS.ERROR],
  [VIDEO_STATUS.READY]: [],
  [VIDEO_STATUS.ERROR]: [VIDEO_STATUS.QUEUED],
};

export function assertValidStatusTransition(from: VideoStatus, to: VideoStatus): void {
  const allowed = VALID_TRANSITIONS[from];

  if (!allowed.includes(to)) {
    throw new InvalidVideoStatusTransitionError(`Transição de status inválida: ${from} → ${to}`);
  }
}
