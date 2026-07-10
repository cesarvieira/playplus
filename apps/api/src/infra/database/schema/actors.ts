import { pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';

import { videos } from './videos.ts';

export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
});

export const videoActors = pgTable(
  'video_actors',
  {
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.videoId, table.actorId] })],
);
