import type { VideoStatus } from '@playplus/shared';

import { getSql } from '../database.ts';

interface UpdateStatusOptions {
  errorReason?: string | null;
}

export class VideoRepository {
  async updateStatus(
    id: string,
    status: VideoStatus,
    options: UpdateStatusOptions = {},
  ): Promise<void> {
    const sql = getSql();
    const errorReason = 'errorReason' in options ? options.errorReason ?? null : null;

    if ('errorReason' in options) {
      await sql`
        UPDATE videos
        SET status = ${status},
            error_reason = ${errorReason},
            updated_at = NOW()
        WHERE id = ${id}
      `;
      return;
    }

    await sql`
      UPDATE videos
      SET status = ${status},
          updated_at = NOW()
      WHERE id = ${id}
    `;
  }
}

export const videoRepository = new VideoRepository();
