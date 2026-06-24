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

describe('VideoRepository', () => {
  let repository: InstanceType<typeof VideoRepository>;

  beforeEach(() => {
    query.mockClear();
    repository = new VideoRepository();
  });

  it('atualiza status sem error_reason', async () => {
    await repository.updateStatus('00000000-0000-4000-8000-000000000001', VIDEO_STATUS.PROCESSING);

    expect(query).toHaveBeenCalledOnce();
  });

  it('atualiza status com error_reason', async () => {
    await repository.updateStatus(
      '00000000-0000-4000-8000-000000000001',
      VIDEO_STATUS.ERROR,
      { errorReason: 'FFmpeg falhou' },
    );

    expect(query).toHaveBeenCalledOnce();
  });

  it('atualiza status com error_reason nulo', async () => {
    await repository.updateStatus(
      '00000000-0000-4000-8000-000000000001',
      VIDEO_STATUS.ERROR,
      { errorReason: null },
    );

    expect(query).toHaveBeenCalledOnce();
  });
});
