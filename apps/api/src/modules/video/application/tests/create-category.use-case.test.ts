import { describe, expect, it, vi } from 'vitest';
import { CategoryAlreadyExistsError, ValidationError } from '@playplus/shared';

import type { TaxonomyRepository } from '../../infra/taxonomy.repository.ts';
import { CreateCategoryUseCase } from '../create-category.use-case.ts';

const categoryId = '00000000-0000-4000-8000-0000000000c1';

describe('CreateCategoryUseCase', () => {
  it('cria categoria com sucesso', async () => {
    const taxonomyRepository = {
      createGenre: vi.fn().mockResolvedValue({
        id: categoryId,
        name: 'Ficção Científica',
        slug: 'ficcao-cientifica',
      }),
    } as unknown as TaxonomyRepository;

    const useCase = new CreateCategoryUseCase(taxonomyRepository);
    const result = await useCase.execute({ name: '  Ficção Científica  ' });

    expect(taxonomyRepository.createGenre).toHaveBeenCalledWith('Ficção Científica');
    expect(result).toEqual({
      id: categoryId,
      name: 'Ficção Científica',
      slug: 'ficcao-cientifica',
    });
  });

  it('propaga CategoryAlreadyExistsError', async () => {
    const taxonomyRepository = {
      createGenre: vi.fn().mockRejectedValue(new CategoryAlreadyExistsError()),
    } as unknown as TaxonomyRepository;

    const useCase = new CreateCategoryUseCase(taxonomyRepository);

    await expect(useCase.execute({ name: 'Ação' })).rejects.toBeInstanceOf(
      CategoryAlreadyExistsError,
    );
  });

  it('lança ValidationError para nome vazio', async () => {
    const taxonomyRepository = {
      createGenre: vi.fn(),
    } as unknown as TaxonomyRepository;

    const useCase = new CreateCategoryUseCase(taxonomyRepository);

    await expect(useCase.execute({ name: '   ' })).rejects.toBeInstanceOf(ValidationError);
    expect(taxonomyRepository.createGenre).not.toHaveBeenCalled();
  });

  it('lança ValidationError quando slug fica vazio', async () => {
    const taxonomyRepository = {
      createGenre: vi.fn(),
    } as unknown as TaxonomyRepository;

    const useCase = new CreateCategoryUseCase(taxonomyRepository);

    await expect(useCase.execute({ name: '!!!' })).rejects.toBeInstanceOf(ValidationError);
    expect(taxonomyRepository.createGenre).not.toHaveBeenCalled();
  });
});
