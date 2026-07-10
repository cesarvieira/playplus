import type { FastifyInstance } from 'fastify';

import { env } from '#config/env';
import { db } from '#infra/database/client';
import { createVideoEventPublisher } from '#infra/events/video-events.publisher';

import { ReconcileStaleVideosUseCase } from '../../modules/video/application/reconcile-stale-videos.use-case.ts';
import { createTranscodeQueue } from '../../modules/video/infra/transcode.queue.ts';
import { VideoRepository } from '../../modules/video/infra/video.repository.ts';

const RECONCILE_INTERVAL_MS = 60_000;

export default async function videoReconcilePlugin(fastify: FastifyInstance): Promise<void> {
  if (env.NODE_ENV === 'test') {
    return;
  }

  const videoRepository = new VideoRepository(db);
  const transcodeQueue = createTranscodeQueue();
  const eventPublisher = createVideoEventPublisher();
  const reconcileUseCase = new ReconcileStaleVideosUseCase(
    videoRepository,
    transcodeQueue,
    eventPublisher,
    env.VIDEO_STALE_MINUTES,
  );

  let interval: ReturnType<typeof setInterval> | null = null;

  fastify.addHook('onReady', async () => {
    const run = async (): Promise<void> => {
      try {
        const result = await reconcileUseCase.execute();

        if (result.requeued > 0 || result.markedError > 0) {
          fastify.log.info(result, 'Reconciliação de vídeos stale concluída');
        }
      } catch (error) {
        fastify.log.error(error, 'Falha na reconciliação de vídeos stale');
      }
    };

    interval = setInterval(() => {
      void run();
    }, RECONCILE_INTERVAL_MS);

    void run();
  });

  fastify.addHook('onClose', async () => {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  });
}
