import { describe, expect, it, vi } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { VideoEntity } from '#modules/video/domain/video.entity';

import { CreateVideoUseCase } from '../create-video.use-case.ts';

const videoId = '00000000-0000-4000-8000-000000000001';

function createUseCase() {
  const videoRepository = {
    create: vi.fn(),
  };
  const storageClient = {
    getPresignedUploadUrl: vi.fn(),
  };

  const useCase = new CreateVideoUseCase(videoRepository as never, storageClient as never);

  return { useCase, videoRepository, storageClient };
}

describe('CreateVideoUseCase', () => {
  it('persiste vídeo pending e retorna presigned upload URL', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(videoId);

    const entity = VideoEntity.createNew({
      title: 'Novo vídeo',
      fileName: 'upload.mp4',
      fileSize: 2048,
    });

    const { useCase, videoRepository, storageClient } = createUseCase();
    videoRepository.create.mockResolvedValue(entity);
    storageClient.getPresignedUploadUrl.mockResolvedValue('https://storage/presigned-url');

    const result = await useCase.execute({
      title: 'Novo vídeo',
      fileName: 'upload.mp4',
      fileSize: 2048,
    });

    expect(videoRepository.create).toHaveBeenCalledWith({
      title: 'Novo vídeo',
      fileName: 'upload.mp4',
      fileSize: 2048,
    });
    expect(storageClient.getPresignedUploadUrl).toHaveBeenCalledWith(
      'videos/00000000-0000-4000-8000-000000000001/original/upload.mp4',
    );
    expect(result).toEqual({
      id: videoId,
      uploadUrl: 'https://storage/presigned-url',
      status: VIDEO_STATUS.PENDING,
    });
  });
});
