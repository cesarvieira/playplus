import { VideoNotFoundError } from '@playplus/shared';

import { assertScheduleDateIsFuture } from '../domain/video-publication.ts';
import type { VideoRepository } from '../infra/video.repository.ts';

interface ScheduleVideoResult {
  id: string;
  publishedAt: string;
}

export class ScheduleVideoUseCase {
  private readonly videoRepository: VideoRepository;

  constructor(videoRepository: VideoRepository) {
    this.videoRepository = videoRepository;
  }

  async execute(videoId: string, publishedAt: Date): Promise<ScheduleVideoResult> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    assertScheduleDateIsFuture(publishedAt, new Date());

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
