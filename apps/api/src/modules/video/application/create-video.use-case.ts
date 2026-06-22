import type { CreateVideoDto, VideoStatus } from '@playplus/shared';

import type { StorageClient } from '#infra/storage/storage.client';

import type { VideoRepository } from '../infra/video.repository.ts';

interface CreateVideoResult {
  id: string;
  uploadUrl: string;
  status: VideoStatus;
}

export class CreateVideoUseCase {
  private readonly videoRepository: VideoRepository;
  private readonly storageClient: StorageClient;

  constructor(videoRepository: VideoRepository, storageClient: StorageClient) {
    this.videoRepository = videoRepository;
    this.storageClient = storageClient;
  }

  async execute(input: CreateVideoDto): Promise<CreateVideoResult> {
    const video = await this.videoRepository.create(input);
    const uploadUrl = await this.storageClient.getPresignedUploadUrl(video.storageOriginalKey);

    return {
      id: video.id,
      uploadUrl,
      status: video.status,
    };
  }
}
