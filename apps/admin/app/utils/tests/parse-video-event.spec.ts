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
