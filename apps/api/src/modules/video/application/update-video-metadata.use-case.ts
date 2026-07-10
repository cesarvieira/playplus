import { ValidationError, VideoNotFoundError } from '@playplus/shared';
import type { ZodError } from 'zod';

import type { VideoEntity } from '../domain/video.entity.ts';
import type { TaxonomyKind, TaxonomyRepository } from '../infra/taxonomy.repository.ts';
import type {
  UpdateVideoMetadataRelations,
  UpdateVideoMetadataScalars,
  VideoRepository,
} from '../infra/video.repository.ts';
import { updateVideoMetadataSchema, type RelationItemInput } from './update-video-metadata.schema.ts';

interface RelationSpec {
  key: 'tags' | 'genres' | 'directors' | 'cast';
  kind: TaxonomyKind;
  patchKey: keyof UpdateVideoMetadataRelations;
}

const RELATION_SPECS: RelationSpec[] = [
  { key: 'tags', kind: 'tag', patchKey: 'tagIds' },
  { key: 'genres', kind: 'genre', patchKey: 'genreIds' },
  { key: 'directors', kind: 'director', patchKey: 'directorIds' },
  { key: 'cast', kind: 'actor', patchKey: 'actorIds' },
];

const KIND_LABEL: Record<TaxonomyKind, string> = {
  tag: 'Tag',
  genre: 'Categoria',
  director: 'Diretor',
  actor: 'Ator',
};

function firstZodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? 'Dados inválidos';
}

function splitRelation(items: RelationItemInput[]): { ids: string[]; names: string[] } {
  const ids: string[] = [];
  const names: string[] = [];

  for (const item of items) {
    if ('id' in item) {
      ids.push(item.id);
    } else {
      names.push(item.name);
    }
  }

  return { ids, names };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Edita metadados de um vídeo (patch parcial). Valida o corpo com Zod,
 * resolve relações (id existente ou find-or-create por nome) e persiste
 * escalares + pivots numa transação. Vincula tags/categorias/etc. por id;
 * id inexistente → VALIDATION_ERROR (422).
 */
export class UpdateVideoMetadataUseCase {
  private readonly videoRepository: VideoRepository;
  private readonly taxonomyRepository: TaxonomyRepository;

  constructor(videoRepository: VideoRepository, taxonomyRepository: TaxonomyRepository) {
    this.videoRepository = videoRepository;
    this.taxonomyRepository = taxonomyRepository;
  }

  async execute(videoId: string, rawInput: unknown): Promise<VideoEntity> {
    const parsed = updateVideoMetadataSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(firstZodMessage(parsed.error));
    }

    const input = parsed.data;

    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new VideoNotFoundError();
    }

    // 1) Separar id/nome e validar existência de todos os ids ANTES de qualquer escrita.
    const splits = new Map<RelationSpec['key'], { ids: string[]; names: string[] }>();
    for (const spec of RELATION_SPECS) {
      const items = input[spec.key];
      if (items === undefined) {
        continue;
      }

      const split = splitRelation(items);
      if (split.ids.length > 0) {
        const existing = new Set(await this.taxonomyRepository.findExistingIds(spec.kind, split.ids));
        const missing = split.ids.find(id => !existing.has(id));
        if (missing !== undefined) {
          throw new ValidationError(`${KIND_LABEL[spec.kind]} não encontrado: ${missing}`);
        }
      }

      splits.set(spec.key, split);
    }

    // 2) Find-or-create dos nomes e montagem do patch de relações.
    const relations: UpdateVideoMetadataRelations = {};
    for (const spec of RELATION_SPECS) {
      const split = splits.get(spec.key);
      if (!split) {
        continue;
      }

      const createdIds =
        split.names.length > 0
          ? await this.taxonomyRepository.findOrCreateByNames(spec.kind, split.names)
          : [];

      relations[spec.patchKey] = dedupe([...split.ids, ...createdIds]);
    }

    // 3) Escalares presentes (null limpa o campo).
    const scalars: UpdateVideoMetadataScalars = {};
    if ('title' in input) scalars.title = input.title;
    if ('description' in input) scalars.description = input.description ?? null;
    if ('release_date' in input) scalars.releaseDate = input.release_date ?? null;
    if ('rating' in input) scalars.rating = input.rating ?? null;
    if ('rating_reason' in input) scalars.ratingReason = input.rating_reason ?? null;
    if ('score' in input) scalars.score = input.score ?? null;

    const updated = await this.videoRepository.updateMetadata(videoId, { scalars, relations });
    if (!updated) {
      throw new VideoNotFoundError();
    }

    return updated;
  }
}
