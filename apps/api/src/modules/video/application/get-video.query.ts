import { VideoNotFoundError, VIDEO_STATUS } from '@playplus/shared';
import type { VideoStatus } from '@playplus/shared';

import type { StorageClient } from '#infra/storage/storage.client';

import type { VideoEntity } from '../domain/video.entity.ts';
import type { VideoRepository } from '../infra/video.repository.ts';
import { resolveUploadComplete } from './resolve-upload-complete.ts';

export function buildStreamUrl(cdnBaseUrl: string, videoId: string): string {
  const base = cdnBaseUrl.replace(/\/$/, '');
  return `${base}/videos/${videoId}/hls/master.m3u8`;
}

interface VideoDetail {
  id: string;
  title: string;
  duration: number | null;
  thumbnailUrl: null;
  status: VideoStatus;
  progress: null;
  createdAt: string;
  streamUrl?: string;
  uploadComplete?: boolean;
}

export class GetVideoQuery {
  private readonly videoRepository: VideoRepository;
  private readonly storageClient: StorageClient;
  private readonly cdnBaseUrl: string;

  constructor(videoRepository: VideoRepository, storageClient: StorageClient, cdnBaseUrl: string) {
    this.videoRepository = videoRepository;
    this.storageClient = storageClient;
    this.cdnBaseUrl = cdnBaseUrl;
  }

  async execute(videoId: string): Promise<VideoDetail> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    return mapToDetail(video, this.storageClient, this.videoRepository, this.cdnBaseUrl);
  }
}

async function mapToDetail(
  video: VideoEntity,
  storageClient: StorageClient,
  videoRepository: VideoRepository,
  cdnBaseUrl: string,
): Promise<VideoDetail> {
  const detail: VideoDetail = {
    id: video.id,
    title: video.title,
    duration: video.status === VIDEO_STATUS.READY ? video.duration : null,
    thumbnailUrl: null,
    status: video.status,
    progress: null,
    createdAt: video.createdAt.toISOString(),
  };

  if (video.status === VIDEO_STATUS.PENDING) {
    detail.uploadComplete = await resolveUploadComplete(video, storageClient, videoRepository);
  }

  if (video.status === VIDEO_STATUS.READY) {
    detail.streamUrl = buildStreamUrl(cdnBaseUrl, video.id);
  }

  return detail;
}
