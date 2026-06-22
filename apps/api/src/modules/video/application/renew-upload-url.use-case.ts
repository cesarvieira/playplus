import { VideoNotFoundError } from '@playplus/shared';
import type { VideoStatus } from '@playplus/shared';

import type { StorageClient } from '#infra/storage/storage.client';

import { assertCanRenewUploadUrl } from '#modules/video/domain/video-status.transitions';
import type { VideoRepository } from '#modules/video/infra/video.repository';

interface RenewUploadUrlResult {
  id: string;
  uploadUrl: string;
  status: VideoStatus;
}

export class RenewUploadUrlUseCase {
  private readonly videoRepository: VideoRepository;
  private readonly storageClient: StorageClient;

  constructor(videoRepository: VideoRepository, storageClient: StorageClient) {
    this.videoRepository = videoRepository;
    this.storageClient = storageClient;
  }

  async execute(videoId: string): Promise<RenewUploadUrlResult> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    assertCanRenewUploadUrl(video.status);

    const uploadUrl = await this.storageClient.getPresignedUploadUrl(video.storageOriginalKey);

    return {
      id: video.id,
      uploadUrl,
      status: video.status,
    };
  }
}
