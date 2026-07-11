import { describe, expect, it, vi } from 'vitest';
import { CategoryAlreadyExistsError } from '@playplus/shared';

import { TaxonomyRepository } from '../taxonomy.repository.ts';

const categoryId = '00000000-0000-4000-8000-0000000000c1';

describe('TaxonomyRepository — genres', () => {
  it('listGenres retorna categorias ordenadas por nome', async () => {
    const categories = [
      { id: categoryId, name: 'Ação', slug: 'acao' },
      { id: '00000000-0000-4000-8000-0000000000c2', name: 'Drama', slug: 'drama' },
    ];
    const orderBy = vi.fn().mockResolvedValue(categories);
    const from = vi.fn().mockReturnValue({ orderBy });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select };
    const repository = new TaxonomyRepository(db as never);

    const result = await repository.listGenres();

    expect(result).toEqual(categories);
    expect(select).toHaveBeenCalled();
    expect(from).toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalled();
  });

  it('createGenre insere e retorna a categoria criada', async () => {
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    const returning = vi
      .fn()
      .mockResolvedValue([{ id: categoryId, name: 'Ação', slug: 'acao' }]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const db = {
      select: vi.fn().mockReturnValue(existingChain),
      insert,
    };
    const repository = new TaxonomyRepository(db as never);

    const result = await repository.createGenre('Ação');

    expect(values).toHaveBeenCalledWith({ name: 'Ação', slug: 'acao' });
    expect(result).toEqual({ id: categoryId, name: 'Ação', slug: 'acao' });
  });

  it('createGenre lança CategoryAlreadyExistsError quando slug já existe', async () => {
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: categoryId }]),
    };
    const db = {
      select: vi.fn().mockReturnValue(existingChain),
      insert: vi.fn(),
    };
    const repository = new TaxonomyRepository(db as never);

    await expect(repository.createGenre('Ação')).rejects.toBeInstanceOf(
      CategoryAlreadyExistsError,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
});
