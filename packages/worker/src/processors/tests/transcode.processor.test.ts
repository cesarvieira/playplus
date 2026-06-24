import { describe, expect, it } from 'vitest';

import { noopTranscodeProcessor } from '../transcode.processor.ts';

const payload = {
  videoId: '00000000-0000-4000-8000-000000000001',
  storageOriginalKey: 'videos/original/movie.mp4',
  fileName: 'movie.mp4',
  fileSize: 1024,
};

describe('noopTranscodeProcessor', () => {
  it('resolve sem executar FFmpeg', async () => {
    await expect(noopTranscodeProcessor.transcode(payload)).resolves.toEqual({
      durationSeconds: 0,
      storageHlsPrefix: 'videos/00000000-0000-4000-8000-000000000001/hls/',
    });
  });
});
