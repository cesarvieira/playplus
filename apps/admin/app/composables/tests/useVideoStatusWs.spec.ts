import { describe, expect, it } from 'vitest';

import { applyVideoEventToPatches } from '../useVideoStatusWs';

describe('applyVideoEventToPatches', () => {
  it('atualiza status e progresso em video.status', () => {
    const next = applyVideoEventToPatches({}, {
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: 'processing',
        progress: 33,
      },
    });

    expect(next).toEqual({
      'video-1': {
        status: 'processing',
        progress: 33,
        errorReason: undefined,
      },
    });
  });

  it('preserva progresso anterior quando evento não traz progress', () => {
    const current = {
      'video-1': {
        status: 'processing' as const,
        progress: 55,
      },
    };

    const next = applyVideoEventToPatches(current, {
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: 'processing',
      },
    });

    expect(next['video-1']?.progress).toBe(55);
  });

  it('marca erro em video.error', () => {
    const next = applyVideoEventToPatches({}, {
      type: 'video.error',
      payload: {
        video_id: 'video-2',
        job_id: 'job-2',
        reason: 'ffmpeg_exit_code_1',
      },
    });

    expect(next).toEqual({
      'video-2': {
        status: 'error',
        errorReason: 'ffmpeg_exit_code_1',
      },
    });
  });
});
