import type { VideoStatus } from '@playplus/shared';

export interface ApiVideoListItem {
  id: string;
  title: string;
  duration: number | null;
  thumbnail_url: string | null;
  status: VideoStatus;
  published_at: string | null;
  upload_complete?: boolean;
  created_at: string;
}

export interface VideoLivePatch {
  status: VideoStatus;
  progress?: number;
  errorReason?: string;
}

export interface VideoPublicationPatch {
  published_at: string | null;
}

export interface DisplayVideoRow extends ApiVideoListItem {
  progress?: number;
  errorReason?: string;
}

export type VideoListFilter = 'all' | 'ready' | 'active' | 'error';

export function buildVideosListPath(
  filter: VideoListFilter,
  page: number,
  limit: number,
): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  params.set('include_unpublished', 'true');

  if (filter === 'ready') {
    params.set('status', 'ready');
  } else if (filter === 'error') {
    params.set('status', 'error');
  }

  return `/videos?${params.toString()}`;
}

export function mergeVideoRow(
  item: ApiVideoListItem,
  patch?: VideoLivePatch,
  publicationPatch?: VideoPublicationPatch,
): DisplayVideoRow {
  return {
    ...item,
    published_at: publicationPatch?.published_at ?? item.published_at,
    status: patch?.status ?? item.status,
    progress: patch?.progress,
    errorReason: patch?.errorReason,
  };
}

export function filterActiveVideos(rows: DisplayVideoRow[]): DisplayVideoRow[] {
  return rows.filter(
    row => row.status === 'queued' || row.status === 'processing',
  );
}

export interface ApiListVideosResponse {
  data: ApiVideoListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiCreateVideoBody {
  title: string;
  file_name: string;
  file_size: number;
}

export interface ApiCreateVideoResponse {
  id: string;
  upload_url: string;
  status: 'pending';
}

export interface ApiRenewUploadUrlResponse {
  id: string;
  upload_url: string;
  status: 'pending';
}

export interface ApiEnqueueTranscodeResponse {
  job_id: string;
  status: 'queued';
}

export interface ApiPublicationResponse {
  id: string;
  published_at: string | null;
}
