export interface ApiVideoListItem {
  id: string;
  title: string;
  duration: number | null;
  thumbnail_url: string | null;
  status: string;
  upload_complete?: boolean;
  created_at: string;
}

export interface ApiListVideosResponse {
  data: ApiVideoListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
