import { inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '#infra/database/schema';
import { actors } from '#infra/database/schema/actors';
import { directors } from '#infra/database/schema/directors';
import { genres } from '#infra/database/schema/genres';
import { tags } from '#infra/database/schema/tags';
import { toSlug } from '#shared/text/slug';

export type TaxonomyKind = 'tag' | 'genre' | 'director' | 'actor';

/**
 * Acesso às entidades de taxonomia (tags, genres, directors, actors).
 * Suporta validação de existência por id e find-or-create por nome —
 * tags/genres deduplicam por `slug`, directors/actors por `name`.
 */
export class TaxonomyRepository {
  private readonly db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.db = db;
  }

  /** Retorna, dentre os ids informados, apenas os que existem na tabela. */
  async findExistingIds(kind: TaxonomyKind, ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    switch (kind) {
      case 'tag': {
        const rows = await this.db.select({ id: tags.id }).from(tags).where(inArray(tags.id, ids));
        return rows.map(row => row.id);
      }
      case 'genre': {
        const rows = await this.db
          .select({ id: genres.id })
          .from(genres)
          .where(inArray(genres.id, ids));
        return rows.map(row => row.id);
      }
      case 'director': {
        const rows = await this.db
          .select({ id: directors.id })
          .from(directors)
          .where(inArray(directors.id, ids));
        return rows.map(row => row.id);
      }
      case 'actor': {
        const rows = await this.db
          .select({ id: actors.id })
          .from(actors)
          .where(inArray(actors.id, ids));
        return rows.map(row => row.id);
      }
    }
  }

  /** Resolve nomes em ids, criando as entidades ausentes. */
  async findOrCreateByNames(kind: TaxonomyKind, names: string[]): Promise<string[]> {
    const unique = [...new Set(names.map(name => name.trim()).filter(name => name.length > 0))];
    if (unique.length === 0) {
      return [];
    }

    if (kind === 'tag' || kind === 'genre') {
      return this.findOrCreateSlugged(kind, unique);
    }

    return this.findOrCreateNamed(kind, unique);
  }

  private async findOrCreateSlugged(kind: 'tag' | 'genre', names: string[]): Promise<string[]> {
    const table = kind === 'tag' ? tags : genres;

    // dedup por slug (nomes distintos podem colidir no mesmo slug)
    const bySlug = new Map<string, string>();
    for (const name of names) {
      const slug = toSlug(name);
      if (slug.length > 0 && !bySlug.has(slug)) {
        bySlug.set(slug, name);
      }
    }

    const slugs = [...bySlug.keys()];
    const rows = [...bySlug.entries()].map(([slug, name]) => ({ name, slug }));

    await this.db.insert(table).values(rows).onConflictDoNothing({ target: table.slug });

    const existing = await this.db
      .select({ id: table.id })
      .from(table)
      .where(inArray(table.slug, slugs));

    return existing.map(row => row.id);
  }

  private async findOrCreateNamed(kind: 'director' | 'actor', names: string[]): Promise<string[]> {
    const table = kind === 'director' ? directors : actors;

    const existing = await this.db
      .select({ id: table.id, name: table.name })
      .from(table)
      .where(inArray(table.name, names));

    const existingNames = new Set(existing.map(row => row.name));
    const toInsert = names.filter(name => !existingNames.has(name)).map(name => ({ name }));

    let insertedIds: string[] = [];
    if (toInsert.length > 0) {
      const inserted = await this.db.insert(table).values(toInsert).returning({ id: table.id });
      insertedIds = inserted.map(row => row.id);
    }

    return [...existing.map(row => row.id), ...insertedIds];
  }
}
