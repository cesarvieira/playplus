import type { VideoStatus } from '../enums/video-status.js';

export interface Video {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  duration: number | null;
  status: VideoStatus;
  uploadComplete: boolean;
  storageOriginalKey: string;
  storageHlsPrefix: string | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  errorReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
