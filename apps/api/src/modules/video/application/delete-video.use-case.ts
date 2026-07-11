import { buildStorageVideoPrefix, VideoNotFoundError } from '@playplus/shared';

import type { StorageClient } from '#infra/storage/storage.client';

import type { TranscodeQueue } from '../infra/transcode.queue.ts';
import type { VideoRepository } from '../infra/video.repository.ts';

export class DeleteVideoUseCase {
  private readonly videoRepository: VideoRepository;
  private readonly storageClient: StorageClient;
  private readonly transcodeQueue: TranscodeQueue;

  constructor(
    videoRepository: VideoRepository,
    storageClient: StorageClient,
    transcodeQueue: TranscodeQueue,
  ) {
    this.videoRepository = videoRepository;
    this.storageClient = storageClient;
    this.transcodeQueue = transcodeQueue;
  }

  async execute(videoId: string): Promise<void> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    await this.transcodeQueue.forceRemoveJob(videoId);
    await this.storageClient.deleteByPrefix(buildStorageVideoPrefix(videoId));

    const deleted = await this.videoRepository.delete(videoId);

    if (!deleted) {
      throw new VideoNotFoundError();
    }
  }
}
