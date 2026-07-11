import { and, count, desc, eq, inArray, isNotNull, lt, lte, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '#infra/database/schema';
import { actors, videoActors } from '#infra/database/schema/actors';
import { directors, videoDirectors } from '#infra/database/schema/directors';
import { genres, videoGenres } from '#infra/database/schema/genres';
import { tags, videoTags } from '#infra/database/schema/tags';
import { videos } from '#infra/database/schema/videos';

import type { Actor, CreateVideoDto, Director, Genre, Tag, VideoRating, VideoStatus } from '@playplus/shared';

import { VideoEntity } from '../domain/video.entity.ts';

type VideoRow = typeof videos.$inferSelect;

interface VideoRelations {
  directors: Director[];
  cast: Actor[];
  genres: Genre[];
  tags: Tag[];
}

export interface UpdateVideoMetadataScalars {
  title?: string;
  description?: string | null;
  releaseDate?: string | null;
  rating?: VideoRating | null;
  ratingReason?: string | null;
  score?: number | null;
}

export interface UpdateVideoMetadataRelations {
  tagIds?: string[];
  genreIds?: string[];
  directorIds?: string[];
  actorIds?: string[];
}

export interface UpdateVideoMetadataPatch {
  scalars: UpdateVideoMetadataScalars;
  relations: UpdateVideoMetadataRelations;
}

interface ListVideosParams {
  page: number;
  limit: number;
  status?: VideoStatus;
  publishedOnly?: boolean;
}

interface CountVideosParams {
  status?: VideoStatus;
  publishedOnly?: boolean;
}

function buildListFilters(params: { status?: VideoStatus; publishedOnly?: boolean }): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.status) {
    conditions.push(eq(videos.status, params.status));
  }

  if (params.publishedOnly) {
    conditions.push(isNotNull(videos.publishedAt));
    conditions.push(lte(videos.publishedAt, sql`now()`));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
}

interface UpdateStatusOptions {
  errorReason?: string | null;
  storageHlsPrefix?: string | null;
}

function mapRowToEntity(row: VideoRow, relations?: VideoRelations): VideoEntity {
  return VideoEntity.fromPersistence({
    id: row.id,
    title: row.title,
    description: row.description,
    releaseDate: row.releaseDate,
    rating: row.rating,
    ratingReason: row.ratingReason,
    score: row.score,
    fileName: row.fileName,
    fileSize: row.fileSize,
    duration: row.duration,
    status: row.status,
    uploadComplete: row.uploadComplete,
    storageOriginalKey: row.storageOriginalKey,
    storageHlsPrefix: row.storageHlsPrefix,
    thumbnailKey: row.thumbnailKey,
    errorReason: row.errorReason,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    directors: relations?.directors,
    cast: relations?.cast,
    genres: relations?.genres,
    tags: relations?.tags,
  });
}

export class VideoRepository {
  private readonly db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.db = db;
  }

  async create(input: CreateVideoDto): Promise<VideoEntity> {
    const entity = VideoEntity.createNew(input);

    const [row] = await this.db
      .insert(videos)
      .values({
        id: entity.id,
        title: entity.title,
        fileName: entity.fileName,
        fileSize: entity.fileSize,
        duration: entity.duration,
        status: entity.status,
        uploadComplete: entity.uploadComplete,
        storageOriginalKey: entity.storageOriginalKey,
        storageHlsPrefix: entity.storageHlsPrefix,
        errorReason: entity.errorReason,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      })
      .returning();

    return mapRowToEntity(row);
  }

  async findById(id: string): Promise<VideoEntity | null> {
    const rows = await this.db.select().from(videos).where(eq(videos.id, id)).limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    const relations = await this.loadRelations(id);

    return mapRowToEntity(row, relations);
  }

  private async loadRelations(id: string): Promise<VideoRelations> {
    const [tagRows, genreRows, directorRows, actorRows] = await Promise.all([
      this.db
        .select({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(videoTags)
        .innerJoin(tags, eq(videoTags.tagId, tags.id))
        .where(eq(videoTags.videoId, id)),
      this.db
        .select({ id: genres.id, name: genres.name, slug: genres.slug })
        .from(videoGenres)
        .innerJoin(genres, eq(videoGenres.genreId, genres.id))
        .where(eq(videoGenres.videoId, id)),
      this.db
        .select({ id: directors.id, name: directors.name })
        .from(videoDirectors)
        .innerJoin(directors, eq(videoDirectors.directorId, directors.id))
        .where(eq(videoDirectors.videoId, id)),
      this.db
        .select({ id: actors.id, name: actors.name })
        .from(videoActors)
        .innerJoin(actors, eq(videoActors.actorId, actors.id))
        .where(eq(videoActors.videoId, id)),
    ]);

    return {
      tags: tagRows,
      genres: genreRows,
      directors: directorRows,
      cast: actorRows,
    };
  }

  async updateMetadata(id: string, patch: UpdateVideoMetadataPatch): Promise<VideoEntity | null> {
    const { scalars, relations } = patch;

    await this.db.transaction(async (tx) => {
      const setValues: Partial<typeof videos.$inferInsert> = { updatedAt: new Date() };

      if ('title' in scalars) setValues.title = scalars.title;
      if ('description' in scalars) setValues.description = scalars.description;
      if ('releaseDate' in scalars) setValues.releaseDate = scalars.releaseDate;
      if ('rating' in scalars) setValues.rating = scalars.rating;
      if ('ratingReason' in scalars) setValues.ratingReason = scalars.ratingReason;
      if ('score' in scalars) setValues.score = scalars.score;

      await tx.update(videos).set(setValues).where(eq(videos.id, id));

      if (relations.tagIds !== undefined) {
        await tx.delete(videoTags).where(eq(videoTags.videoId, id));
        if (relations.tagIds.length > 0) {
          await tx.insert(videoTags).values(relations.tagIds.map(tagId => ({ videoId: id, tagId })));
        }
      }

      if (relations.genreIds !== undefined) {
        await tx.delete(videoGenres).where(eq(videoGenres.videoId, id));
        if (relations.genreIds.length > 0) {
          await tx
            .insert(videoGenres)
            .values(relations.genreIds.map(genreId => ({ videoId: id, genreId })));
        }
      }

      if (relations.directorIds !== undefined) {
        await tx.delete(videoDirectors).where(eq(videoDirectors.videoId, id));
        if (relations.directorIds.length > 0) {
          await tx
            .insert(videoDirectors)
            .values(relations.directorIds.map(directorId => ({ videoId: id, directorId })));
        }
      }

      if (relations.actorIds !== undefined) {
        await tx.delete(videoActors).where(eq(videoActors.videoId, id));
        if (relations.actorIds.length > 0) {
          await tx
            .insert(videoActors)
            .values(relations.actorIds.map(actorId => ({ videoId: id, actorId })));
        }
      }
    });

    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: VideoStatus,
    options: UpdateStatusOptions = {},
  ): Promise<VideoEntity | null> {
    const updateValues: Partial<typeof videos.$inferInsert> = {
      status,
      updatedAt: new Date(),
    };

    if ('errorReason' in options) {
      updateValues.errorReason = options.errorReason;
    }

    if ('storageHlsPrefix' in options) {
      updateValues.storageHlsPrefix = options.storageHlsPrefix;
    }

    const rows = await this.db
      .update(videos)
      .set(updateValues)
      .where(eq(videos.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      return null;
    }

    return mapRowToEntity(row);
  }

  async setUploadComplete(id: string, value: boolean): Promise<VideoEntity | null> {
    const rows = await this.db
      .update(videos)
      .set({
        uploadComplete: value,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      return null;
    }

    return mapRowToEntity(row);
  }

  async updatePublishedAt(id: string, publishedAt: Date | null): Promise<VideoEntity | null> {
    const rows = await this.db
      .update(videos)
      .set({
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      return null;
    }

    return mapRowToEntity(row);
  }

  async list(params: ListVideosParams): Promise<VideoEntity[]> {
    const offset = (params.page - 1) * params.limit;

    const baseQuery = this.db.select().from(videos);
    const filters = buildListFilters(params);

    const filteredQuery = filters ? baseQuery.where(filters) : baseQuery;

    const rows = await filteredQuery
      .orderBy(desc(videos.createdAt))
      .limit(params.limit)
      .offset(offset);

    return rows.map(row => mapRowToEntity(row));
  }

  async count(params: CountVideosParams = {}): Promise<number> {
    const baseQuery = this.db.select({ total: count() }).from(videos);
    const filters = buildListFilters(params);

    const rows = filters ? await baseQuery.where(filters) : await baseQuery;

    return rows[0]?.total ?? 0;
  }

  async findStaleByStatus(statuses: VideoStatus[], olderThan: Date): Promise<VideoEntity[]> {
    const rows = await this.db
      .select()
      .from(videos)
      .where(and(inArray(videos.status, statuses), lt(videos.updatedAt, olderThan)));

    return rows.map(row => mapRowToEntity(row));
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(videos).where(eq(videos.id, id)).returning({ id: videos.id });

    return rows.length > 0;
  }
}
