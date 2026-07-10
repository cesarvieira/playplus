export const VIDEO_RATING = {
  L: 'livre',
  AGE_10: '10',
  AGE_12: '12',
  AGE_14: '14',
  AGE_16: '16',
  AGE_18: '18',
} as const;

export type VideoRating = (typeof VIDEO_RATING)[keyof typeof VIDEO_RATING];
