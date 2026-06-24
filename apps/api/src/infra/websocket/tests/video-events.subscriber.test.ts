import { afterEach, describe, expect, it, vi } from 'vitest';
import { VIDEO_EVENTS_CHANNEL, VIDEO_STATUS } from '@playplus/shared';

import { createVideoEventsSubscriber } from '../video-events.subscriber.ts';

describe('createVideoEventsSubscriber', () => {
  const subscribe = vi.fn().mockResolvedValue(undefined);
  const unsubscribe = vi.fn().mockResolvedValue(undefined);
  const quit = vi.fn().mockResolvedValue(undefined);
  const on = vi.fn();
  const off = vi.fn();

  const client = {
    on,
    off,
    subscribe,
    unsubscribe,
    quit,
    status: 'ready',
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('inscreve no canal de eventos de vídeo', async () => {
    const onEvent = vi.fn();
    const subscriber = createVideoEventsSubscriber(client as never, onEvent);

    await subscriber.start();

    expect(subscribe).toHaveBeenCalledWith(VIDEO_EVENTS_CHANNEL);
    expect(on).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('dispara callback para mensagem válida', async () => {
    const onEvent = vi.fn();
    const subscriber = createVideoEventsSubscriber(client as never, onEvent);

    await subscriber.start();

    const messageHandler = on.mock.calls[0]?.[1] as (channel: string, message: string) => void;
    const event = {
      type: 'video.status',
      payload: {
        video_id: 'video-1',
        job_id: 'job-1',
        status: VIDEO_STATUS.READY,
      },
    };

    messageHandler(VIDEO_EVENTS_CHANNEL, JSON.stringify(event));

    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it('ignora mensagens inválidas', async () => {
    const onEvent = vi.fn();
    const subscriber = createVideoEventsSubscriber(client as never, onEvent);

    await subscriber.start();

    const messageHandler = on.mock.calls[0]?.[1] as (channel: string, message: string) => void;
    messageHandler(VIDEO_EVENTS_CHANNEL, 'not-json');

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('encerra inscrição no stop', async () => {
    const onEvent = vi.fn();
    const subscriber = createVideoEventsSubscriber(client as never, onEvent);

    await subscriber.start();
    await subscriber.stop();

    expect(off).toHaveBeenCalledWith('message', expect.any(Function));
    expect(unsubscribe).toHaveBeenCalledWith(VIDEO_EVENTS_CHANNEL);
    expect(quit).toHaveBeenCalled();
  });
});
