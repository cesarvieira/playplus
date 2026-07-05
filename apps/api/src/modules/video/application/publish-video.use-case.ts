import { VideoNotFoundError } from '@playplus/shared';

import type { VideoRepository } from '../infra/video.repository.ts';

interface PublishVideoResult {
  id: string;
  publishedAt: string;
}

export class PublishVideoUseCase {
  private readonly videoRepository: VideoRepository;

  constructor(videoRepository: VideoRepository) {
    this.videoRepository = videoRepository;
  }

  async execute(videoId: string): Promise<PublishVideoResult> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    const publishedAt = new Date();
    const updated = await this.videoRepository.updatePublishedAt(videoId, publishedAt);

    if (!updated) {
      throw new VideoNotFoundError();
    }

    return {
      id: updated.id,
      publishedAt: publishedAt.toISOString(),
    };
  }
}
