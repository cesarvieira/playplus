import { VideoNotFoundError, VIDEO_STATUS } from '@playplus/shared';
import type { VideoStatus } from '@playplus/shared';

import type { MediaTokenSigner } from '#infra/media/media-token';
import type { StorageClient } from '#infra/storage/storage.client';

import type { VideoEntity } from '../domain/video.entity.ts';
import { isCatalogVisible } from '../domain/video-publication.ts';
import type { VideoRepository } from '../infra/video.repository.ts';
import { resolveUploadComplete } from './resolve-upload-complete.ts';

/** Prefixo de storage autorizado por um token de mídia — cobre HLS e thumbnail. */
export function mediaPrefixForVideo(videoId: string): string {
  return `videos/${videoId}`;
}

function withToken(url: string, token?: string): string {
  return token ? `${url}?t=${token}` : url;
}

export function buildStreamUrl(cdnBaseUrl: string, videoId: string, token?: string): string {
  const base = cdnBaseUrl.replace(/\/$/, '');
  return withToken(`${base}/videos/${videoId}/hls/master.m3u8`, token);
}

export function buildThumbnailUrl(cdnBaseUrl: string, thumbnailKey: string, token?: string): string {
  const base = cdnBaseUrl.replace(/\/$/, '');
  return withToken(`${base}/${thumbnailKey}`, token);
}

interface VideoDetail {
  id: string;
  title: string;
  duration: number | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  status: VideoStatus;
  errorReason?: string | null;
  progress: null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  streamUrl?: string;
  uploadComplete?: boolean;
}

export class GetVideoQuery {
  private readonly videoRepository: VideoRepository;
  private readonly storageClient: StorageClient;
  private readonly cdnBaseUrl: string;
  private readonly mediaTokenSigner: MediaTokenSigner;

  constructor(
    videoRepository: VideoRepository,
    storageClient: StorageClient,
    cdnBaseUrl: string,
    mediaTokenSigner: MediaTokenSigner,
  ) {
    this.videoRepository = videoRepository;
    this.storageClient = storageClient;
    this.cdnBaseUrl = cdnBaseUrl;
    this.mediaTokenSigner = mediaTokenSigner;
  }

  async execute(
    videoId: string,
    options: { includeUnpublished?: boolean } = {},
  ): Promise<VideoDetail> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    if (
      options.includeUnpublished !== true &&
      !isCatalogVisible(video.publishedAt, new Date())
    ) {
      throw new VideoNotFoundError();
    }

    return mapToDetail(video, {
      storageClient: this.storageClient,
      videoRepository: this.videoRepository,
      cdnBaseUrl: this.cdnBaseUrl,
      mediaTokenSigner: this.mediaTokenSigner,
    });
  }
}

interface VideoMapDeps {
  storageClient: StorageClient;
  videoRepository: VideoRepository;
  cdnBaseUrl: string;
  mediaTokenSigner: MediaTokenSigner;
}

async function mapToDetail(video: VideoEntity, deps: VideoMapDeps): Promise<VideoDetail> {
  const { storageClient, videoRepository, cdnBaseUrl, mediaTokenSigner } = deps;
  const mediaToken = mediaTokenSigner.sign(mediaPrefixForVideo(video.id));
  const thumbnailUrl =
    video.thumbnailKey ? buildThumbnailUrl(cdnBaseUrl, video.thumbnailKey, mediaToken) : null;

  const detail: VideoDetail = {
    id: video.id,
    title: video.title,
    duration: video.status === VIDEO_STATUS.READY ? video.duration : null,
    thumbnailKey: video.thumbnailKey,
    thumbnailUrl,
    status: video.status,
    progress: null,
    publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  };

  if (video.status === VIDEO_STATUS.PENDING) {
    detail.uploadComplete = await resolveUploadComplete(video, storageClient, videoRepository);
  }

  if (video.status === VIDEO_STATUS.ERROR) {
    detail.errorReason = video.errorReason;
  }

  if (video.status === VIDEO_STATUS.READY) {
    detail.streamUrl = buildStreamUrl(cdnBaseUrl, video.id, mediaToken);
  }

  return detail;
}

