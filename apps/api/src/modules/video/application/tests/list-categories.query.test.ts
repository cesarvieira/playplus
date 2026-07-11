import { describe, expect, it, vi } from 'vitest';

import type { TaxonomyRepository } from '../../infra/taxonomy.repository.ts';
import { ListCategoriesQuery } from '../list-categories.query.ts';

const categoryId = '00000000-0000-4000-8000-0000000000c1';

describe('ListCategoriesQuery', () => {
  it('retorna lista vazia com meta coerente', async () => {
    const taxonomyRepository = {
      listGenres: vi.fn().mockResolvedValue([]),
    } as unknown as TaxonomyRepository;

    const query = new ListCategoriesQuery(taxonomyRepository);
    const result = await query.execute();

    expect(result).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 0 },
    });
  });

  it('retorna categorias com meta refletindo o total', async () => {
    const categories = [
      { id: categoryId, name: 'Ação', slug: 'acao' },
      { id: '00000000-0000-4000-8000-0000000000c2', name: 'Drama', slug: 'drama' },
    ];
    const taxonomyRepository = {
      listGenres: vi.fn().mockResolvedValue(categories),
    } as unknown as TaxonomyRepository;

    const query = new ListCategoriesQuery(taxonomyRepository);
    const result = await query.execute();

    expect(result).toEqual({
      data: categories,
      meta: { total: 2, page: 1, limit: 2 },
    });
  });
});
