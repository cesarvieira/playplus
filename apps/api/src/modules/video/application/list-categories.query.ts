import type { Category } from '@playplus/shared';

import type { TaxonomyRepository } from '../infra/taxonomy.repository.ts';

interface ListCategoriesResult {
  data: Category[];
  meta: {
    total: number;
    page: 1;
    limit: number;
  };
}

export class ListCategoriesQuery {
  private readonly taxonomyRepository: TaxonomyRepository;

  constructor(taxonomyRepository: TaxonomyRepository) {
    this.taxonomyRepository = taxonomyRepository;
  }

  async execute(): Promise<ListCategoriesResult> {
    const genres = await this.taxonomyRepository.listGenres();
    const total = genres.length;

    return {
      data: genres,
      meta: {
        total,
        page: 1,
        limit: total,
      },
    };
  }
}
