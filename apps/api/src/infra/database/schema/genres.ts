import { pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';

import { videos } from './videos.ts';

export const genres = pgTable('genres', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
});

export const videoGenres = pgTable(
  'video_genres',
  {
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.videoId, table.genreId] })],
);
