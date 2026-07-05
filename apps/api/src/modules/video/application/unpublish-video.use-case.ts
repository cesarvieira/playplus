import { VideoNotFoundError } from '@playplus/shared';

import type { VideoRepository } from '../infra/video.repository.ts';

interface UnpublishVideoResult {
  id: string;
  publishedAt: null;
}

export class UnpublishVideoUseCase {
  private readonly videoRepository: VideoRepository;

  constructor(videoRepository: VideoRepository) {
    this.videoRepository = videoRepository;
  }

  async execute(videoId: string): Promise<UnpublishVideoResult> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    const updated = await this.videoRepository.updatePublishedAt(videoId, null);

    if (!updated) {
      throw new VideoNotFoundError();
    }

    return {
      id: updated.id,
      publishedAt: null,
    };
  }
}
