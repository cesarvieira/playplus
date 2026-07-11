import { z } from 'zod';
import { VIDEO_RATING } from '@playplus/shared';
import type { VideoRating } from '@playplus/shared';

const RATING_VALUES = Object.values(VIDEO_RATING) as [VideoRating, ...VideoRating[]];

/** Item de relação: id de entidade existente OU nome para find-or-create. */
const relationItemSchema = z.union([
  z.object({ id: z.uuid() }).strict(),
  z.object({ name: z.string().trim().min(1) }).strict(),
]);

const relationArraySchema = z.array(relationItemSchema);

/**
 * Corpo do `PATCH /videos/:id` — todos os campos opcionais (patch parcial).
 * Campos escalares aceitam `null` para limpar; relações aceitam `[]` para esvaziar.
 * Chaves desconhecidas são rejeitadas (`.strict()`) → VALIDATION_ERROR 422.
 */
export const updateVideoMetadataSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().nullable(),
    release_date: z
      .iso.date({ message: 'release_date deve ser uma data ISO (YYYY-MM-DD)' })
      .nullable(),
    rating: z.enum(RATING_VALUES).nullable(),
    rating_reason: z.string().nullable(),
    score: z.number().min(0).max(10).nullable(),
    directors: relationArraySchema,
    cast: relationArraySchema,
    genres: relationArraySchema,
    tags: relationArraySchema,
  })
  .partial()
  .strict();

export type RelationItemInput = z.infer<typeof relationItemSchema>;
