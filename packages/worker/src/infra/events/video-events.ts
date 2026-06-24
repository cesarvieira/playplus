import type { Redis } from 'ioredis';

import { VIDEO_EVENTS_CHANNEL, type VideoStatusEvent } from '@playplus/shared';

import { getValkeyClient } from '../valkey.ts';

export type VideoStatusEventPayload = VideoStatusEvent['payload'];

export interface VideoEventPublisher {
  publishVideoStatus(payload: VideoStatusEventPayload): Promise<void>;
}

export function createVideoEventPublisher(client: Redis = getValkeyClient()): VideoEventPublisher {
  return {
    async publishVideoStatus(payload: VideoStatusEventPayload): Promise<void> {
      const event: VideoStatusEvent = {
        type: 'video.status',
        payload,
      };

      await client.publish(VIDEO_EVENTS_CHANNEL, JSON.stringify(event));
    },
  };
}
