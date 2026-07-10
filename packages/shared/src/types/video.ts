import type { VideoStatus } from '../enums/video-status.js';
import type { VideoRating } from '../enums/video-rating.js';
import type { Director } from './director.js';
import type { Actor } from './actor.js';
import type { Genre } from './genre.js';
import type { Tag } from './tag.js';

export interface Video {
  id: string;
  title: string;
  description?: string;
  directors?: Director[];
  releaseDate?: string;
  cast?: Actor[];
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
  rating?: VideoRating;
  ratingReason?: string;
  score?: number;
  genres?: Genre[];
  tags?: Tag[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
