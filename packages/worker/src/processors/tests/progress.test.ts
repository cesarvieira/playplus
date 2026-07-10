import { describe, expect, it } from 'vitest';

import { mapEncodeProgress, TRANSCODE_PROGRESS } from '../progress.ts';

describe('mapEncodeProgress', () => {
  it('mapeia 0% local para início da fase encode', () => {
    expect(mapEncodeProgress(0)).toBe(TRANSCODE_PROGRESS.ENCODE_START);
  });

  it('mapeia 100% local para fim da fase encode', () => {
    expect(mapEncodeProgress(100)).toBe(TRANSCODE_PROGRESS.ENCODE_END);
  });

  it('clamp valores fora do intervalo', () => {
    expect(mapEncodeProgress(-10)).toBe(TRANSCODE_PROGRESS.ENCODE_START);
    expect(mapEncodeProgress(200)).toBe(TRANSCODE_PROGRESS.ENCODE_END);
  });
});
