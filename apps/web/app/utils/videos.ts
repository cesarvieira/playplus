import type { VideoStatus } from '@playplus/shared';

export interface VideoListItem {
  id: string;
  title: string;
  duration: number | null;
  thumbnail_url: string | null;
  status: VideoStatus;
  created_at: string;
}

export interface VideoListResponse {
  data: VideoListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export function buildReadyVideosPath(page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set('status', 'ready');
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/videos?${params.toString()}`;
}
