import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VIDEO_STATUS } from '@playplus/shared';

const query = vi.fn().mockResolvedValue([]);

function sqlTemplate(_strings: TemplateStringsArray, ..._values: unknown[]) {
  return query();
}

vi.mock('../../database.ts', () => ({
  getSql: () => sqlTemplate,
}));

const { VideoRepository } = await import('../video.repository.ts');

describe('VideoRepository — ready', () => {
  let repository: InstanceType<typeof VideoRepository>;

  beforeEach(() => {
    query.mockReset();
    repository = new VideoRepository();
  });

  it('persiste ready com duration e storage_hls_prefix após validar transição', async () => {
    query
      .mockResolvedValueOnce([{ status: VIDEO_STATUS.PROCESSING }])
      .mockResolvedValueOnce([]);

    await repository.updateStatus('00000000-0000-4000-8000-000000000001', VIDEO_STATUS.READY, {
      duration: 120,
      storageHlsPrefix: 'videos/00000000-0000-4000-8000-000000000001/hls/',
    });

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('rejeita transição inválida para ready', async () => {
    query.mockResolvedValueOnce([{ status: VIDEO_STATUS.PENDING }]);

    await expect(
      repository.updateStatus('00000000-0000-4000-8000-000000000001', VIDEO_STATUS.READY, {
        duration: 120,
        storageHlsPrefix: 'videos/00000000-0000-4000-8000-000000000001/hls/',
      }),
    ).rejects.toThrow(/Transição de status inválida/);

    expect(query).toHaveBeenCalledOnce();
  });

  it('lança quando vídeo não existe', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      repository.updateStatus('00000000-0000-4000-8000-000000000001', VIDEO_STATUS.PROCESSING),
    ).rejects.toThrow(/Vídeo não encontrado/);
  });
});
