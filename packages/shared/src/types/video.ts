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
  errorReason: string | null;
  createdAt: string;
  updatedAt: string;
}
