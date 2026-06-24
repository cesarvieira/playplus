import type { TranscodeJobPayload } from '@playplus/shared';

import { logger } from '../config/logger.ts';

export interface TranscodeProcessor {
  transcode(payload: TranscodeJobPayload): Promise<void>;
}

export const noopTranscodeProcessor: TranscodeProcessor = {
  async transcode(payload) {
    logger.info(
      { videoId: payload.videoId, storageOriginalKey: payload.storageOriginalKey },
      'Transcode processor noop — FFmpeg pendente',
    );
  },
};
