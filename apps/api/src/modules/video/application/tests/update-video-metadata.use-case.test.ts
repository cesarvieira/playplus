import { describe, expect, it, vi } from 'vitest';
import { ValidationError, VideoNotFoundError } from '@playplus/shared';

import { UpdateVideoMetadataUseCase } from '../update-video-metadata.use-case.ts';

const videoId = '00000000-0000-4000-8000-000000000001';
const tagId = '00000000-0000-4000-8000-0000000000a1';

function createUseCase() {
  const videoRepository = {
    findById: vi.fn(),
    updateMetadata: vi.fn(),
  };
  const taxonomyRepository = {
    findExistingIds: vi.fn(),
    findOrCreateByNames: vi.fn(),
  };
  const useCase = new UpdateVideoMetadataUseCase(
    videoRepository as never,
    taxonomyRepository as never,
  );

  return { useCase, videoRepository, taxonomyRepository };
}

describe('UpdateVideoMetadataUseCase', () => {
  it('aplica somente os campos escalares enviados (patch parcial)', async () => {
    const { useCase, videoRepository, taxonomyRepository } = createUseCase();
    videoRepository.findById.mockResolvedValue({ id: videoId });
    videoRepository.updateMetadata.mockResolvedValue({ id: videoId });

    await useCase.execute(videoId, { description: 'Nova sinopse' });

    expect(taxonomyRepository.findExistingIds).not.toHaveBeenCalled();
    expect(videoRepository.updateMetadata).toHaveBeenCalledWith(videoId, {
      scalars: { description: 'Nova sinopse' },
      relations: {},
    });
  });

  it('vincula tag por id existente', async () => {
    const { useCase, videoRepository, taxonomyRepository } = createUseCase();
    videoRepository.findById.mockResolvedValue({ id: videoId });
    videoRepository.updateMetadata.mockResolvedValue({ id: videoId });
    taxonomyRepository.findExistingIds.mockResolvedValue([tagId]);

    await useCase.execute(videoId, { tags: [{ id: tagId }] });

    expect(taxonomyRepository.findExistingIds).toHaveBeenCalledWith('tag', [tagId]);
    expect(videoRepository.updateMetadata).toHaveBeenCalledWith(videoId, {
      scalars: {},
      relations: { tagIds: [tagId] },
    });
  });

  it('lança ValidationError quando um id de relação não existe', async () => {
    const { useCase, videoRepository, taxonomyRepository } = createUseCase();
    videoRepository.findById.mockResolvedValue({ id: videoId });
    taxonomyRepository.findExistingIds.mockResolvedValue([]);

    await expect(useCase.execute(videoId, { tags: [{ id: tagId }] })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(videoRepository.updateMetadata).not.toHaveBeenCalled();
  });

  it('cria relação a partir de texto via find-or-create', async () => {
    const { useCase, videoRepository, taxonomyRepository } = createUseCase();
    videoRepository.findById.mockResolvedValue({ id: videoId });
    videoRepository.updateMetadata.mockResolvedValue({ id: videoId });
    taxonomyRepository.findOrCreateByNames.mockResolvedValue([tagId]);

    await useCase.execute(videoId, { tags: [{ name: 'Ação' }] });

    expect(taxonomyRepository.findOrCreateByNames).toHaveBeenCalledWith('tag', ['Ação']);
    expect(videoRepository.updateMetadata).toHaveBeenCalledWith(videoId, {
      scalars: {},
      relations: { tagIds: [tagId] },
    });
  });

  it('lança VideoNotFoundError quando o vídeo não existe', async () => {
    const { useCase, videoRepository } = createUseCase();
    videoRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(videoId, { description: 'x' })).rejects.toBeInstanceOf(
      VideoNotFoundError,
    );
  });

  it('lança ValidationError quando o corpo é inválido (score fora de faixa)', async () => {
    const { useCase, videoRepository } = createUseCase();

    await expect(useCase.execute(videoId, { score: 11 })).rejects.toBeInstanceOf(ValidationError);
    expect(videoRepository.findById).not.toHaveBeenCalled();
  });

  it('rejeita chaves desconhecidas no corpo', async () => {
    const { useCase } = createUseCase();

    await expect(useCase.execute(videoId, { unknown_field: true })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
