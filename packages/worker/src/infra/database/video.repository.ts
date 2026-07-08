import {
  VIDEO_STATUS,
  assertValidStatusTransition,
  type VideoStatus,
} from '@playplus/shared';

import { getSql } from '../database.ts';

interface UpdateStatusOptions {
  duration?: number;
  storageHlsPrefix?: string;
  thumbnailKey?: string | null;
  errorReason?: string | null;
}

export class VideoRepository {
  async findStatusById(id: string): Promise<VideoStatus | null> {
    const sql = getSql();
    const rows = await sql<{ status: VideoStatus }[]>`
      SELECT status
      FROM videos
      WHERE id = ${id}
      LIMIT 1
    `;

    return rows[0]?.status ?? null;
  }

  async updateStatus(
    id: string,
    status: VideoStatus,
    options: UpdateStatusOptions = {},
  ): Promise<void> {
    const currentStatus = await this.findStatusById(id);

    if (!currentStatus) {
      throw new Error(`Vídeo não encontrado: ${id}`);
    }

    assertValidStatusTransition(currentStatus, status);

    const sql = getSql();

    if (status === VIDEO_STATUS.READY && 'duration' in options && 'storageHlsPrefix' in options) {
      if ('thumbnailKey' in options) {
        await sql`
          UPDATE videos
          SET status = ${status},
              duration = ${options.duration ?? null},
              storage_hls_prefix = ${options.storageHlsPrefix ?? null},
              thumbnail_key = ${options.thumbnailKey ?? null},
              error_reason = NULL,
              updated_at = NOW()
          WHERE id = ${id}
        `;
        return;
      }

      await sql`
        UPDATE videos
        SET status = ${status},
            duration = ${options.duration ?? null},
            storage_hls_prefix = ${options.storageHlsPrefix ?? null},
            error_reason = NULL,
            updated_at = NOW()
        WHERE id = ${id}
      `;
      return;
    }

    if ('errorReason' in options) {
      const errorReason = options.errorReason ?? null;

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
