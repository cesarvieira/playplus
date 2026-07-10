import {
  ValidationError,
  VideoNotFoundError,
  VIDEO_STATUS,
  buildTranscodeJobId,
} from '@playplus/shared';
import type { VideoStatus } from '@playplus/shared';

import type { StorageClient } from '#infra/storage/storage.client';

import { JobAlreadyQueuedError } from '#modules/video/domain/job-already-queued.error';
import {
  assertCanEnqueueTranscode,
  assertValidStatusTransition,
} from '../domain/video-status.transitions.ts';
import type { TranscodeQueue } from '../infra/transcode.queue.ts';
import type { VideoRepository } from '../infra/video.repository.ts';

interface EnqueueTranscodeResult {
  jobId: string;
  status: VideoStatus;
}

export class EnqueueTranscodeUseCase {
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

  async execute(videoId: string): Promise<EnqueueTranscodeResult> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    assertCanEnqueueTranscode(video.status);

    if (await this.transcodeQueue.isJobActive(videoId)) {
      throw new JobAlreadyQueuedError();
    }

    const objectExists = await this.storageClient.objectExists(video.storageOriginalKey);

    if (!objectExists) {
      throw new ValidationError('Upload não concluído');
    }

    await this.videoRepository.setUploadComplete(videoId, true);
    assertValidStatusTransition(video.status, VIDEO_STATUS.QUEUED);

    if (video.status === VIDEO_STATUS.ERROR) {
      await this.transcodeQueue.removeOrphanJob(videoId);
      await this.videoRepository.updateStatus(videoId, VIDEO_STATUS.QUEUED, { errorReason: null });
    } else {
      await this.videoRepository.updateStatus(videoId, VIDEO_STATUS.QUEUED);
    }
    await this.transcodeQueue.enqueue({
      videoId: video.id,
      storageOriginalKey: video.storageOriginalKey,
      fileName: video.fileName,
      fileSize: video.fileSize,
    });

    return {
      jobId: buildTranscodeJobId(videoId),
      status: VIDEO_STATUS.QUEUED,
    };
  }
}
