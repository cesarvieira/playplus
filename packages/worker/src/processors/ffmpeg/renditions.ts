import { HLS_RENDITIONS, type HlsRendition } from './constants.ts';

export function selectRenditions(sourceHeight: number): HlsRendition[] {
  return HLS_RENDITIONS.filter(rendition => rendition.height <= sourceHeight);
}
