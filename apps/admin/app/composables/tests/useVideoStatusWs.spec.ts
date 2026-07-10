import { describe, expect, it } from 'vitest';

import { applyVideoEventToPatches } from '../useVideoStatusWs';

const FIXED_NOW = '2026-07-09T12:00:00.000Z';

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
    }, FIXED_NOW);

    expect(next).toEqual({
      'video-1': {
        status: 'processing',
        progress: 33,
        errorReason: undefined,
        retryAttempt: undefined,
        maxAttempts: undefined,
        lastActivityAt: FIXED_NOW,
      },
    });
  });

  it('preserva progresso anterior quando evento não traz progress', () => {
    const current = {
      'video-1': {
        status: 'processing' as const,
        progress: 55,
        lastActivityAt: '2026-07-09T11:00:00.000Z',
      },
    };

    const next = applyVideoEventToPatches(current, {
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: 'processing',
      },
    }, FIXED_NOW);

    expect(next['video-1']?.progress).toBe(55);
    expect(next['video-1']?.lastActivityAt).toBe(FIXED_NOW);
  });

  it('marca erro em video.error', () => {
    const next = applyVideoEventToPatches({}, {
      type: 'video.error',
      payload: {
        video_id: 'video-2',
        job_id: 'job-2',
        reason: 'ffmpeg_exit_code_1',
      },
    }, FIXED_NOW);

    expect(next).toEqual({
      'video-2': {
        status: 'error',
        errorReason: 'ffmpeg_exit_code_1',
        progress: undefined,
        retryAttempt: undefined,
        maxAttempts: undefined,
        lastActivityAt: FIXED_NOW,
      },
    });
  });

  it('registra lastActivityAt em video.retry', () => {
    const next = applyVideoEventToPatches({}, {
      type: 'video.retry',
      payload: {
        video_id: 'video-3',
        job_id: 'job-3',
        attempt: 2,
        max_attempts: 3,
        reason: 'ffmpeg_exit_code_1',
      },
    }, FIXED_NOW);

    expect(next['video-3']?.lastActivityAt).toBe(FIXED_NOW);
    expect(next['video-3']?.retryAttempt).toBe(2);
  });
});
