import { describe, expect, it } from 'vitest';
import { VIDEO_STATUS } from '@playplus/shared';

import { parseVideoEvent } from '../parse-video-event.ts';

describe('parseVideoEvent', () => {
  it('parseia video.status válido', () => {
    const raw = JSON.stringify({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: VIDEO_STATUS.PROCESSING,
        progress: 47,
      },
    });

    expect(parseVideoEvent(raw)).toEqual({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: VIDEO_STATUS.PROCESSING,
        progress: 47,
      },
    });
  });

  it('parseia video.error válido', () => {
    const raw = JSON.stringify({
      type: 'video.error',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        reason: 'ffmpeg_exit_code_1',
      },
    });

    expect(parseVideoEvent(raw)).toEqual({
      type: 'video.error',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        reason: 'ffmpeg_exit_code_1',
      },
    });
  });

  it('rejeita JSON inválido', () => {
    expect(parseVideoEvent('not-json')).toBeNull();
  });

  it('rejeita tipo desconhecido', () => {
    expect(parseVideoEvent(JSON.stringify({ type: 'player.progress', payload: {} }))).toBeNull();
  });

  it('rejeita video.status com status inválido', () => {
    const raw = JSON.stringify({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: 'unknown',
      },
    });

    expect(parseVideoEvent(raw)).toBeNull();
  });

  it('rejeita video.status com progress fora do intervalo', () => {
    const raw = JSON.stringify({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: VIDEO_STATUS.PROCESSING,
        progress: 150,
      },
    });

    expect(parseVideoEvent(raw)).toBeNull();
  });
});
