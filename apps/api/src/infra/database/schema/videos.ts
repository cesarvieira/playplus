import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
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

export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    duration: integer('duration'),
    status: videoStatusEnum('status').notNull().default('pending'),
    uploadComplete: boolean('upload_complete').notNull().default(false),
    storageOriginalKey: varchar('storage_original_key', { length: 512 }).notNull(),
    storageHlsPrefix: varchar('storage_hls_prefix', { length: 512 }),
    errorReason: varchar('error_reason', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('videos_status_idx').on(table.status),
    index('videos_created_at_idx').on(table.createdAt.desc()),
  ],
);
