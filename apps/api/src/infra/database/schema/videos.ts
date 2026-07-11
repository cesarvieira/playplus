import {
  bigint,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const videoStatusEnum = pgEnum('video_status', [
  'pending',
  'queued',
  'processing',
  'ready',
  'error',
]);

export const videoRatingEnum = pgEnum('video_rating', [
  'livre',
  '10',
  '12',
  '14',
  '16',
  '18',
]);

export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    releaseDate: date('release_date'),
    rating: videoRatingEnum('rating'),
    ratingReason: text('rating_reason'),
    score: numeric('score', { precision: 3, scale: 1, mode: 'number' }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    duration: integer('duration'),
    status: videoStatusEnum('status').notNull().default('pending'),
    uploadComplete: boolean('upload_complete').notNull().default(false),
    storageOriginalKey: varchar('storage_original_key', { length: 512 }).notNull(),
    storageHlsPrefix: varchar('storage_hls_prefix', { length: 512 }),
    errorReason: varchar('error_reason', { length: 512 }),
    thumbnailKey: varchar('thumbnail_key', { length: 512 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('videos_status_idx').on(table.status),
    index('videos_created_at_idx').on(table.createdAt.desc()),
  ],
);
