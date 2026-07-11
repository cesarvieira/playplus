import type { VideoRating } from '../enums/video-rating.js';
import type { Director } from '../types/director.js';
import type { Actor } from '../types/actor.js';
import type { Genre } from '../types/genre.js';
import type { Tag } from '../types/tag.js';

export interface UpdateVideoDto {
  title?: string;
  description?: string;
  directors?: Director[];
  releaseDate?: string;
  cast?: Actor[];
  rating?: VideoRating;
  ratingReason?: string;
  score?: number;
  genres?: Genre[];
  tags?: Tag[];
}
