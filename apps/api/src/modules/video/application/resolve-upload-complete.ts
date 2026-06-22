import { VIDEO_STATUS } from '@playplus/shared';

import type { StorageClient } from '#infra/storage/storage.client';

import type { VideoEntity } from '../domain/video.entity.ts';
import type { VideoRepository } from '../infra/video.repository.ts';

export async function resolveUploadComplete(
  video: VideoEntity,
  storageClient: StorageClient,
  videoRepository: VideoRepository,
): Promise<boolean> {
  if (video.status !== VIDEO_STATUS.PENDING) {
    return video.uploadComplete;
  }

  if (video.uploadComplete) {
    return true;
  }

  const objectExists = await storageClient.objectExists(video.storageOriginalKey);

  if (!objectExists) {
    return false;
  }

  await videoRepository.setUploadComplete(video.id, true);

  return true;
}
