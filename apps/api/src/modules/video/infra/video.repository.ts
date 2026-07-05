import { and, count, desc, eq, isNotNull, lte, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '#infra/database/schema';
import { videos } from '#infra/database/schema/videos';

import type { CreateVideoDto, VideoStatus } from '@playplus/shared';

import { VideoEntity } from '../domain/video.entity.ts';

type VideoRow = typeof videos.$inferSelect;

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

function mapRowToEntity(row: VideoRow): VideoEntity {
  return VideoEntity.fromPersistence({
    id: row.id,
    title: row.title,
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

    return mapRowToEntity(row);
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

    return rows.map(mapRowToEntity);
  }

  async count(params: CountVideosParams = {}): Promise<number> {
    const baseQuery = this.db.select({ total: count() }).from(videos);
    const filters = buildListFilters(params);

    const rows = filters ? await baseQuery.where(filters) : await baseQuery;

    return rows[0]?.total ?? 0;
  }
}
