import { ValidationError } from '@playplus/shared';

export function isCatalogVisible(publishedAt: Date | null, now: Date): boolean {
  if (publishedAt === null) {
    return false;
  }

  return publishedAt.getTime() <= now.getTime();
}

export function assertScheduleDateIsFuture(publishedAt: Date, now: Date): void {
  if (publishedAt.getTime() <= now.getTime()) {
    throw new ValidationError('published_at deve ser uma data futura');
  }
}
