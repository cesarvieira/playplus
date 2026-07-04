import { VIDEO_STATUS } from '@playplus/shared';
import type { VideoStatus } from '@playplus/shared';

import type { StorageClient } from '#infra/storage/storage.client';

import type { VideoEntity } from '../domain/video.entity.ts';
import type { VideoRepository } from '../infra/video.repository.ts';
import { buildThumbnailUrl } from './get-video.query.ts';
import { resolveUploadComplete } from './resolve-upload-complete.ts';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type CatalogListStatusFilter = Extract<VideoStatus, 'ready' | 'processing' | 'error'>;

interface ListVideosInput {
  page?: number;
  limit?: number;
  status?: CatalogListStatusFilter;
}

interface VideoListItem {
  id: string;
  title: string;
  duration: number | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  status: VideoStatus;
  uploadComplete?: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface ListVideosResult {
  data: VideoListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

function normalizePagination(input: ListVideosInput): { page: number; limit: number } {
  const page = input.page ?? DEFAULT_PAGE;
  const limit = input.limit ?? DEFAULT_LIMIT;

  return {
    page: Math.max(1, page),
    limit: Math.min(MAX_LIMIT, Math.max(1, limit)),
  };
}

async function mapToListItem(
  video: VideoEntity,
  storageClient: StorageClient,
  videoRepository: VideoRepository,
  cdnBaseUrl: string,
): Promise<VideoListItem> {
  const thumbnailUrl =
    video.thumbnailKey ? buildThumbnailUrl(cdnBaseUrl, video.thumbnailKey) : null;

  const item: VideoListItem = {
    id: video.id,
    title: video.title,
    duration: video.duration,
    thumbnailKey: video.thumbnailKey,
    thumbnailUrl,
    status: video.status,
    publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
    createdAt: video.createdAt.toISOString(),
  };

  if (video.status === VIDEO_STATUS.PENDING) {
    item.uploadComplete = await resolveUploadComplete(video, storageClient, videoRepository);
  }

  return item;
}

export class ListVideosQuery {
  private readonly videoRepository: VideoRepository;
  private readonly storageClient: StorageClient;
  private readonly cdnBaseUrl: string;

  constructor(videoRepository: VideoRepository, storageClient: StorageClient, cdnBaseUrl: string) {
    this.videoRepository = videoRepository;
    this.storageClient = storageClient;
    this.cdnBaseUrl = cdnBaseUrl;
  }

  async execute(input: ListVideosInput = {}): Promise<ListVideosResult> {
    const { page, limit } = normalizePagination(input);

    const [videos, total] = await Promise.all([
      this.videoRepository.list({ page, limit, status: input.status }),
      this.videoRepository.count({ status: input.status }),
    ]);

    const data = await Promise.all(
      videos.map(video => mapToListItem(video, this.storageClient, this.videoRepository, this.cdnBaseUrl)),
    );

    return {
      data,
      meta: { total, page, limit },
    };
  }
}

