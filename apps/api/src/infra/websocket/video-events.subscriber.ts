import {
  VIDEO_EVENTS_CHANNEL,
  type VideoEvent,
} from '@playplus/shared';

import { getInfraLogger } from '#config/logger';
import type { RedisClient } from '#infra/valkey/client';

import { parseVideoEvent } from './parse-video-event.ts';

export type { VideoEvent };

export interface VideoEventsSubscriber {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createVideoEventsSubscriber(
  client: RedisClient,
  onEvent: (event: VideoEvent) => void,
): VideoEventsSubscriber {
  let messageHandler: ((channel: string, message: string) => void) | null = null;

  return {
    async start(): Promise<void> {
      messageHandler = (channel: string, message: string): void => {
        if (channel !== VIDEO_EVENTS_CHANNEL) {
          return;
        }

        const event = parseVideoEvent(message);

        if (event === null) {
          getInfraLogger().warn({ channel }, 'Evento de vídeo inválido no pub/sub');
          return;
        }

        onEvent(event);
      };

      client.on('message', messageHandler);
      await client.subscribe(VIDEO_EVENTS_CHANNEL);
    },

    async stop(): Promise<void> {
      if (messageHandler !== null) {
        client.off('message', messageHandler);
        messageHandler = null;
      }

      if (client.status === 'end') {
        return;
      }

      await client.unsubscribe(VIDEO_EVENTS_CHANNEL);
      await client.quit();
    },
  };
}
