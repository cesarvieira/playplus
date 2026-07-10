import { describe, expect, it, vi } from 'vitest';

import { TaxonomyRepository } from '../taxonomy.repository.ts';

const tagId = '00000000-0000-4000-8000-0000000000a1';
const directorId = '00000000-0000-4000-8000-0000000000b1';

describe('TaxonomyRepository', () => {
  it('findExistingIds retorna [] sem consultar quando ids vazio', async () => {
    const db = { select: vi.fn() };
    const repository = new TaxonomyRepository(db as never);

    const result = await repository.findExistingIds('tag', []);

    expect(result).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('findExistingIds retorna os ids encontrados', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: tagId }]),
    };
    const db = { select: vi.fn().mockReturnValue(chain) };
    const repository = new TaxonomyRepository(db as never);

    const result = await repository.findExistingIds('tag', [tagId]);

    expect(result).toEqual([tagId]);
  });

  it('findOrCreateByNames cria tag por slug (upsert)', async () => {
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: tagId }]),
    };
    const db = {
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnValue(selectChain),
    };
    const repository = new TaxonomyRepository(db as never);

    const result = await repository.findOrCreateByNames('tag', ['Ação']);

    expect(insertChain.values).toHaveBeenCalledWith([{ name: 'Ação', slug: 'acao' }]);
    expect(result).toEqual([tagId]);
  });

  it('findOrCreateByNames cria director ausente por nome', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: directorId }]),
    };
    const db = {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
    };
    const repository = new TaxonomyRepository(db as never);

    const result = await repository.findOrCreateByNames('director', ['Christopher Nolan']);

    expect(insertChain.values).toHaveBeenCalledWith([{ name: 'Christopher Nolan' }]);
    expect(result).toEqual([directorId]);
  });
});
