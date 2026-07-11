import type { Category, CreateCategoryDto } from '@playplus/shared';
import { ValidationError } from '@playplus/shared';

import type { TaxonomyRepository } from '../infra/taxonomy.repository.ts';
import { toSlug } from '#shared/text/slug';

export class CreateCategoryUseCase {
  private readonly taxonomyRepository: TaxonomyRepository;

  constructor(taxonomyRepository: TaxonomyRepository) {
    this.taxonomyRepository = taxonomyRepository;
  }

  async execute(input: CreateCategoryDto): Promise<Category> {
    const trimmed = input.name.trim();

    if (trimmed.length === 0) {
      throw new ValidationError('Nome da categoria é obrigatório');
    }

    const slug = toSlug(trimmed);
    if (slug.length === 0) {
      throw new ValidationError('Nome da categoria inválido');
    }

    return this.taxonomyRepository.createGenre(trimmed);
  }
}
