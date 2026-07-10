/**
 * Item de relação enviado ao editar metadados de vídeo.
 * Aceita um id de entidade já existente OU um nome para find-or-create.
 * Usado por tags, genres, directors e actors no `PATCH /videos/:id`.
 */
export type RelationInput = { id: string } | { name: string };
