import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VIDEO_EVENTS_CHANNEL } from '@playplus/shared';

import { createVideoEventPublisher } from '../video-events.ts';

describe('createVideoEventPublisher — video.error', () => {
  const publish = vi.fn();

  beforeEach(() => {
    publish.mockReset().mockResolvedValue(1);
  });

  it('publica video.error no canal ADR-002', async () => {
    const publisher = createVideoEventPublisher({ publish } as never);

    await publisher.publishVideoError({
      video_id: '00000000-0000-4000-8000-000000000001',
      job_id: 'transcode:job',
      reason: 'ffmpeg_exit_code_1',
    });

    expect(publish).toHaveBeenCalledWith(
      VIDEO_EVENTS_CHANNEL,
      JSON.stringify({
        type: 'video.error',
        payload: {
          video_id: '00000000-0000-4000-8000-000000000001',
          job_id: 'transcode:job',
          reason: 'ffmpeg_exit_code_1',
        },
      }),
    );
  });
});
