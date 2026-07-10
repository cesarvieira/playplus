import { VIDEO_STATUS } from '@playplus/shared';
import type { VideoStatus } from '@playplus/shared';

import type { MediaTokenSigner } from '#infra/media/media-token';
import type { StorageClient } from '#infra/storage/storage.client';

import type { VideoEntity } from '../domain/video.entity.ts';
import type { VideoRepository } from '../infra/video.repository.ts';
import { buildThumbnailUrl, mediaPrefixForVideo } from './get-video.query.ts';
import { resolveUploadComplete } from './resolve-upload-complete.ts';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type CatalogListStatusFilter = Extract<VideoStatus, 'ready' | 'processing' | 'error'>;

interface ListVideosInput {
  page?: number;
  limit?: number;
  status?: CatalogListStatusFilter;
  includeUnpublished?: boolean;
}

interface VideoListItem {
  id: string;
  title: string;
  duration: number | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  status: VideoStatus;
  errorReason?: string | null;
  uploadComplete?: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

interface VideoMapDeps {
  storageClient: StorageClient;
  videoRepository: VideoRepository;
  cdnBaseUrl: string;
  mediaTokenSigner: MediaTokenSigner;
}

async function mapToListItem(video: VideoEntity, deps: VideoMapDeps): Promise<VideoListItem> {
  const { storageClient, videoRepository, cdnBaseUrl, mediaTokenSigner } = deps;
  const thumbnailUrl = video.thumbnailKey
    ? buildThumbnailUrl(cdnBaseUrl, video.thumbnailKey, mediaTokenSigner.sign(mediaPrefixForVideo(video.id)))
    : null;

  const item: VideoListItem = {
    id: video.id,
    title: video.title,
    duration: video.duration,
    thumbnailKey: video.thumbnailKey,
    thumbnailUrl,
    status: video.status,
    publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  };

  if (video.status === VIDEO_STATUS.PENDING) {
    item.uploadComplete = await resolveUploadComplete(video, storageClient, videoRepository);
  }

  if (video.status === VIDEO_STATUS.ERROR) {
    item.errorReason = video.errorReason;
  }

  return item;
}

export class ListVideosQuery {
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

  async execute(input: ListVideosInput = {}): Promise<ListVideosResult> {
    const { page, limit } = normalizePagination(input);

    const repositoryParams = {
      page,
      limit,
      status: input.status,
      ...(input.includeUnpublished !== true ? { publishedOnly: true } : {}),
    };

    const [videos, total] = await Promise.all([
      this.videoRepository.list(repositoryParams),
      this.videoRepository.count(
        input.includeUnpublished !== true
          ? { status: input.status, publishedOnly: true }
          : { status: input.status },
      ),
    ]);

    const deps: VideoMapDeps = {
      storageClient: this.storageClient,
      videoRepository: this.videoRepository,
      cdnBaseUrl: this.cdnBaseUrl,
      mediaTokenSigner: this.mediaTokenSigner,
    };

    const data = await Promise.all(videos.map(video => mapToListItem(video, deps)));

    return {
      data,
      meta: { total, page, limit },
    };
  }
}

