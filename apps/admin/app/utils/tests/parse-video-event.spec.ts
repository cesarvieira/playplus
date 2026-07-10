import { describe, expect, it } from 'vitest';

import { parseVideoEvent } from '../parse-video-event';

describe('parseVideoEvent', () => {
  it('parseia video.status válido com progresso', () => {
    const raw = JSON.stringify({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'transcode-video-1',
        status: 'processing',
        progress: 47,
      },
    });

    expect(parseVideoEvent(raw)).toEqual({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'transcode-video-1',
        status: 'processing',
        progress: 47,
      },
    });
  });

  it('parseia video.error válido', () => {
    const raw = JSON.stringify({
      type: 'video.error',
      payload: {
        video_id: 'video-2',
        job_id: 'transcode-video-2',
        reason: 'ffmpeg_exit_code_1',
      },
    });

    expect(parseVideoEvent(raw)).toEqual({
      type: 'video.error',
      payload: {
        video_id: 'video-2',
        job_id: 'transcode-video-2',
        reason: 'ffmpeg_exit_code_1',
      },
    });
  });

  it('parseia video.retry válido', () => {
    const raw = JSON.stringify({
      type: 'video.retry',
      payload: {
        video_id: 'video-3',
        job_id: 'transcode-video-3',
        attempt: 2,
        max_attempts: 3,
        reason: 'ffmpeg_exit_code_1',
      },
    });

    expect(parseVideoEvent(raw)).toEqual({
      type: 'video.retry',
      payload: {
        video_id: 'video-3',
        job_id: 'transcode-video-3',
        attempt: 2,
        max_attempts: 3,
        reason: 'ffmpeg_exit_code_1',
      },
    });
  });

  it('parseia video.status com status error e reason', () => {
    const raw = JSON.stringify({
      type: 'video.status',
      payload: {
        video_id: 'video-4',
        job_id: 'transcode-video-4',
        status: 'error',
        reason: 'processing_timeout',
      },
    });

    expect(parseVideoEvent(raw)).toEqual({
      type: 'video.status',
      payload: {
        video_id: 'video-4',
        job_id: 'transcode-video-4',
        status: 'error',
        reason: 'processing_timeout',
      },
    });
  });

  it('rejeita progresso fora do intervalo', () => {
    const raw = JSON.stringify({
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: 'processing',
        progress: 120,
      },
    });

    expect(parseVideoEvent(raw)).toBeNull();
  });

  it('rejeita json inválido', () => {
    expect(parseVideoEvent('not-json')).toBeNull();
  });
});
