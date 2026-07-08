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

describe('VideoRepository — thumbnail', () => {
  let repository: InstanceType<typeof VideoRepository>;

  beforeEach(() => {
    query.mockReset();
    repository = new VideoRepository();
  });

  it('persiste thumbnail_key ao marcar ready', async () => {
    query
      .mockResolvedValueOnce([{ status: VIDEO_STATUS.PROCESSING }])
      .mockResolvedValueOnce([]);

    await repository.updateStatus('00000000-0000-4000-8000-000000000001', VIDEO_STATUS.READY, {
      duration: 120,
      storageHlsPrefix: 'videos/00000000-0000-4000-8000-000000000001/hls/',
      thumbnailKey: 'videos/00000000-0000-4000-8000-000000000001/hls/thumbnail.jpg',
    });

    expect(query).toHaveBeenCalledTimes(2);
  });
});
