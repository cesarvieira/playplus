import {
  VIDEO_STATUS,
  buildTranscodeJobId,
} from '@playplus/shared';

import type { VideoEventPublisher } from '#infra/events/video-events.publisher';

import type { VideoEntity } from '../domain/video.entity.ts';
import type { TranscodeQueue } from '../infra/transcode.queue.ts';
import type { VideoRepository } from '../infra/video.repository.ts';

const ACTIVE_JOB_STATES = new Set(['waiting', 'active', 'delayed']);
const TERMINAL_JOB_STATES = new Set(['failed', 'stalled']);

interface ReconcileStaleVideosResult {
  requeued: number;
  markedError: number;
}

export class ReconcileStaleVideosUseCase {
  private readonly videoRepository: VideoRepository;
  private readonly transcodeQueue: TranscodeQueue;
  private readonly eventPublisher: VideoEventPublisher;
  private readonly staleMinutes: number;

  constructor(
    videoRepository: VideoRepository,
    transcodeQueue: TranscodeQueue,
    eventPublisher: VideoEventPublisher,
    staleMinutes: number,
  ) {
    this.videoRepository = videoRepository;
    this.transcodeQueue = transcodeQueue;
    this.eventPublisher = eventPublisher;
    this.staleMinutes = staleMinutes;
  }

  async execute(): Promise<ReconcileStaleVideosResult> {
    const olderThan = new Date(Date.now() - this.staleMinutes * 60 * 1000);
    const staleVideos = await this.videoRepository.findStaleByStatus(
      [VIDEO_STATUS.QUEUED, VIDEO_STATUS.PROCESSING],
      olderThan,
    );

    let requeued = 0;
    let markedError = 0;

    for (const video of staleVideos) {
      const jobState = await this.transcodeQueue.getJobState(video.id);

      if (video.status === VIDEO_STATUS.QUEUED) {
        if (jobState === null || jobState === 'failed') {
          await this.requeueVideo(video);
          requeued += 1;
        }

        continue;
      }

      if (video.status === VIDEO_STATUS.PROCESSING) {
        if (jobState !== null && ACTIVE_JOB_STATES.has(jobState)) {
          continue;
        }

        const errorReason =
          jobState === null ? 'worker_unavailable' : 'processing_timeout';

        await this.markProcessingError(video, errorReason);
        markedError += 1;
      }
    }

    return { requeued, markedError };
  }

  private async requeueVideo(video: VideoEntity): Promise<void> {
    const jobState = await this.transcodeQueue.getJobState(video.id);

    if (jobState !== null && TERMINAL_JOB_STATES.has(jobState)) {
      await this.transcodeQueue.removeOrphanJob(video.id);
    }

    await this.transcodeQueue.enqueue({
      videoId: video.id,
      storageOriginalKey: video.storageOriginalKey,
      fileName: video.fileName,
      fileSize: video.fileSize,
    });
  }

  private async markProcessingError(video: VideoEntity, errorReason: string): Promise<void> {
    const jobId = buildTranscodeJobId(video.id);

    await this.videoRepository.updateStatus(video.id, VIDEO_STATUS.ERROR, { errorReason });

    await this.eventPublisher.publishVideoError({
      video_id: video.id,
      job_id: jobId,
      reason: errorReason,
    });

    await this.eventPublisher.publishVideoStatus({
      video_id: video.id,
      job_id: jobId,
      status: VIDEO_STATUS.ERROR,
      reason: errorReason,
    });
  }
}
