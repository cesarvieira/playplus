export * from './enums/user-role.ts';
export * from './enums/video-status.ts';
export * from './enums/video-rating.ts';
export * from './enums/error-code.ts';
export * from './enums/health-check-status.ts';
export * from './enums/health-status.ts';
export * from './enums/video-queue.ts';
export * from './enums/video-events.ts';

export type { User } from './types/user.ts';
export type { Video } from './types/video.ts';
export type { Director } from './types/director.ts';
export type { Actor } from './types/actor.ts';
export type { Tag } from './types/tag.ts';
export type { Genre } from './types/genre.ts';

export type { LoginDto } from './dtos/login.dto.ts';
export type { AuthResponseDto } from './dtos/auth-response.dto.ts';
export type { CreateVideoDto } from './dtos/create-video.dto.ts';
export type { UpdateVideoDto } from './dtos/update-video.dto.ts';
export type { HealthResponseDto } from './dtos/health-response.dto.ts';
export type { TranscodeJobPayload } from './dtos/transcode-job.dto.ts';

export { UnauthorizedError } from './errors/unauthorized.error.ts';
export { InvalidTokenError } from './errors/invalid-token.error.ts';
export { ForbiddenError } from './errors/forbidden.error.ts';
export { ValidationError } from './errors/validation.error.ts';
export { UserNotFoundError } from './errors/user-not-found.error.ts';
export { VideoNotFoundError } from './errors/video-not-found.error.ts';
export { InvalidVideoStatusTransitionError } from './errors/invalid-video-status-transition.error.ts';

export {
  buildStorageHlsPrefix,
  buildStorageOriginalKey,
  buildStorageThumbnailKey,
} from './paths/video-storage.ts';
export {
  VALID_TRANSITIONS,
  assertValidStatusTransition,
} from './domain/video-status.transitions.ts';
