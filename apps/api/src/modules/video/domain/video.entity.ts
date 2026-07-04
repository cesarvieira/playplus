import type { CreateVideoDto, Video, VideoStatus } from '@playplus/shared';
import {
  VIDEO_STATUS,
  buildStorageHlsPrefix,
  buildStorageOriginalKey,
} from '@playplus/shared';

export { buildStorageHlsPrefix, buildStorageOriginalKey };

interface VideoPersistenceProps {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  duration: number | null;
  status: VideoStatus;
  uploadComplete: boolean;
  storageOriginalKey: string;
  storageHlsPrefix: string | null;
  thumbnailKey: string | null;
  errorReason: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoEntity {
  readonly id: string;
  readonly title: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly duration: number | null;
  readonly status: VideoStatus;
  readonly uploadComplete: boolean;
  readonly storageOriginalKey: string;
  readonly storageHlsPrefix: string | null;
  readonly thumbnailKey: string | null;
  readonly errorReason: string | null;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: VideoPersistenceProps) {
    this.id = props.id;
    this.title = props.title;
    this.fileName = props.fileName;
    this.fileSize = props.fileSize;
    this.duration = props.duration;
    this.status = props.status;
    this.uploadComplete = props.uploadComplete;
    this.storageOriginalKey = props.storageOriginalKey;
    this.storageHlsPrefix = props.storageHlsPrefix;
    this.thumbnailKey = props.thumbnailKey;
    this.errorReason = props.errorReason;
    this.publishedAt = props.publishedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static fromPersistence(props: VideoPersistenceProps): VideoEntity {
    return new VideoEntity(props);
  }

  static createNew(input: CreateVideoDto): VideoEntity {
    const id = crypto.randomUUID();
    const now = new Date();

    return new VideoEntity({
      id,
      title: input.title,
      fileName: input.fileName,
      fileSize: input.fileSize,
      duration: null,
      status: VIDEO_STATUS.PENDING,
      uploadComplete: false,
      storageOriginalKey: buildStorageOriginalKey(id, input.fileName),
      storageHlsPrefix: buildStorageHlsPrefix(id),
      thumbnailKey: null,
      errorReason: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  toVideo(): Video {
    return {
      id: this.id,
      title: this.title,
      fileName: this.fileName,
      fileSize: this.fileSize,
      duration: this.duration,
      status: this.status,
      uploadComplete: this.uploadComplete,
      storageOriginalKey: this.storageOriginalKey,
      storageHlsPrefix: this.storageHlsPrefix,
      thumbnailKey: this.thumbnailKey,
      thumbnailUrl: null,
      errorReason: this.errorReason,
      publishedAt: this.publishedAt ? this.publishedAt.toISOString() : null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

