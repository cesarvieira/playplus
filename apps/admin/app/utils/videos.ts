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
