import type { Redis } from 'ioredis';

import {
  VIDEO_EVENTS_CHANNEL,
  type VideoErrorEvent,
  type VideoRetryEvent,
  type VideoStatusEvent,
} from '@playplus/shared';

import { getValkeyClient } from '../valkey.ts';

type VideoStatusEventPayload = VideoStatusEvent['payload'];
type VideoErrorEventPayload = VideoErrorEvent['payload'];
type VideoRetryEventPayload = VideoRetryEvent['payload'];

export interface VideoEventPublisher {
  publishVideoStatus(payload: VideoStatusEventPayload): Promise<void>;
  publishVideoError(payload: VideoErrorEventPayload): Promise<void>;
  publishVideoRetry(payload: VideoRetryEventPayload): Promise<void>;
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

    async publishVideoError(payload: VideoErrorEventPayload): Promise<void> {
      const event: VideoErrorEvent = {
        type: 'video.error',
        payload,
      };

      await client.publish(VIDEO_EVENTS_CHANNEL, JSON.stringify(event));
    },

    async publishVideoRetry(payload: VideoRetryEventPayload): Promise<void> {
      const event: VideoRetryEvent = {
        type: 'video.retry',
        payload,
      };

      await client.publish(VIDEO_EVENTS_CHANNEL, JSON.stringify(event));
    },
  };
}
