export const createVideoBodySchema = {
  type: 'object',
  required: ['title', 'file_name', 'file_size'],
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      minLength: 1,
    },
    file_name: {
      type: 'string',
      minLength: 1,
    },
    file_size: {
      type: 'integer',
      minimum: 1,
    },
  },
} as const;

export const createVideoResponseSchema = {
  type: 'object',
  required: ['id', 'upload_url', 'status'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    upload_url: { type: 'string' },
    status: { type: 'string', enum: ['pending'] },
  },
} as const;

export interface CreateVideoRequestBody {
  title: string;
  file_name: string;
  file_size: number;
}

export const videoIdParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

export const renewUploadUrlResponseSchema = {
  type: 'object',
  required: ['id', 'upload_url', 'status'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    upload_url: { type: 'string' },
    status: { type: 'string', enum: ['pending'] },
  },
} as const;

export const enqueueTranscodeResponseSchema = {
  type: 'object',
  required: ['job_id', 'status'],
  additionalProperties: false,
  properties: {
    job_id: { type: 'string' },
    status: { type: 'string', enum: ['queued'] },
  },
} as const;

export const listVideosQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: ['ready', 'processing', 'error'] },
  },
} as const;

export interface ListVideosQuerystring {
  page?: number;
  limit?: number;
  status?: 'ready' | 'processing' | 'error';
}

const videoListItemSchema = {
  type: 'object',
  required: ['id', 'title', 'duration', 'thumbnail_url', 'status', 'published_at', 'created_at'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    duration: { type: ['integer', 'null'] },
    thumbnail_url: { type: ['string', 'null'] },
    status: {
      type: 'string',
      enum: ['pending', 'queued', 'processing', 'ready', 'error'],
    },
    upload_complete: { type: 'boolean' },
    published_at: { type: ['string', 'null'], format: 'date-time' },
    created_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const listVideosResponseSchema = {
  type: 'object',
  required: ['data', 'meta'],
  additionalProperties: false,
  properties: {
    data: {
      type: 'array',
      items: videoListItemSchema,
    },
    meta: {
      type: 'object',
      required: ['total', 'page', 'limit'],
      additionalProperties: false,
      properties: {
        total: { type: 'integer', minimum: 0 },
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1 },
      },
    },
  },
} as const;

export const getVideoResponseSchema = {
  type: 'object',
  required: ['id', 'title', 'duration', 'thumbnail_url', 'status', 'progress', 'published_at', 'created_at'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    duration: { type: ['integer', 'null'] },
    thumbnail_url: { type: ['string', 'null'] },
    stream_url: { type: 'string' },
    status: {
      type: 'string',
      enum: ['pending', 'queued', 'processing', 'ready', 'error'],
    },
    upload_complete: { type: 'boolean' },
    progress: { type: 'null' },
    published_at: { type: ['string', 'null'], format: 'date-time' },
    created_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const errorResponseSchema = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      additionalProperties: false,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

export const scheduleVideoBodySchema = {
  type: 'object',
  required: ['published_at'],
  additionalProperties: false,
  properties: {
    published_at: { type: 'string', format: 'date-time' },
  },
} as const;

export interface ScheduleVideoRequestBody {
  published_at: string;
}

export const publishVideoResponseSchema = {
  type: 'object',
  required: ['id', 'published_at'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    published_at: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;
