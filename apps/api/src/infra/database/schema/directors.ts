import { pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';

import { videos } from './videos.ts';

export const directors = pgTable('directors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
});

export const videoDirectors = pgTable(
  'video_directors',
  {
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    directorId: uuid('director_id')
      .notNull()
      .references(() => directors.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.videoId, table.directorId] })],
);
